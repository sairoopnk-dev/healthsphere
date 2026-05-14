/**
 * ML Router
 * Orchestrates the hybrid ML + AI pipeline for symptom checking.
 *
 * Flow:
 *   Symptom Input
 *     → ML Inference
 *     → Confidence Evaluation
 *     → HIGH (≥0.85):   Return ML result directly (zero AI tokens)
 *     → MEDIUM (0.60–0.84): ML prediction + AI explanation only
 *     → LOW (<0.60):    Full AI reasoning pipeline (Gemini → Grok → Offline)
 */

import { runInference } from './modelLoader';
import { ConfidenceTier } from './confidence';
import { getAIResponse, AIAllProvidersFailedError } from '../utils/aiHandler';
import { offlineSymptomCheck } from '../utils/offlineFallback';
import { SymptomCheckResult } from '../utils/aiSymptomChecker';

export interface HybridResult extends SymptomCheckResult {
  // ML metadata
  source: 'ml_model' | 'ml_model+ai_explanation' | 'ai_fallback' | 'offline_fallback';
  mlConfidence: number;
  mlConfidenceTier: ConfidenceTier | 'N/A';
  mlDisease: string;
  mlCategory: string;
  mlIcd10: string;
  mlUrgency: string;
  severityLabel: 'low' | 'medium' | 'high' | 'emergency';
  emergencyFlag: boolean;
  structuredRecommendations: string[];
  warningFlags: string[];
  followUpIn: string;
  fallbackUsed: boolean;
  inferenceMs: number;
  tokensSaved: number;
  layerUsed: string;
}

/**
 * Build a structured HybridResult from ML inference output (no AI call)
 */
function buildMLOnlyResult(
  mlResult: Awaited<ReturnType<typeof runInference>>,
  symptoms: string
): HybridResult {
  const { prediction, confidence, severity, recommendations, inferenceMs } = mlResult;

  // Build a natural-language explanation from ML data
  const conditionList = prediction.candidates
    .slice(0, 3)
    .map(c => c.disease)
    .join(', ');

  const explanation =
    `Based on your reported symptoms, the ML analysis suggests ${prediction.topDisease} ` +
    `(${prediction.category}). ` +
    `${severity.urgencyText}. ` +
    (prediction.candidates.length > 1
      ? `Other possible conditions include: ${conditionList}.`
      : '');

  return {
    // Standard SymptomCheckResult fields
    severity: severity.score,
    explanation,
    recommendation: recommendations.careLevel,
    possibleConditions: prediction.candidates.slice(0, 4).map(c => c.disease),

    // ML metadata
    source: 'ml_model',
    mlConfidence: confidence.score,
    mlConfidenceTier: confidence.tier,
    mlDisease: prediction.topDisease,
    mlCategory: prediction.category,
    mlIcd10: prediction.icd10,
    mlUrgency: prediction.urgency,
    severityLabel: severity.label,
    emergencyFlag: severity.emergencyFlag,
    structuredRecommendations: recommendations.recommendations,
    warningFlags: recommendations.warningFlags,
    followUpIn: recommendations.followUpIn,
    fallbackUsed: false,
    inferenceMs,
    tokensSaved: confidence.tokenSavingEstimate,
    layerUsed: `ML Engine (${(confidence.score * 100).toFixed(0)}% confidence)`,
  };
}

/**
 * Build explanation-only prompt for MEDIUM confidence tier
 * (ML handles prediction, AI only formats the explanation)
 */
function buildExplanationPrompt(
  symptoms: string,
  mlResult: Awaited<ReturnType<typeof runInference>>
): string {
  const { prediction, severity, recommendations } = mlResult;

  return `You are a medical AI assistant. An ML model has already predicted the likely condition.
Your ONLY task is to write a clear, empathetic 2-3 sentence explanation for the patient.

ML Prediction:
- Condition: ${prediction.topDisease}
- Category: ${prediction.category}
- Severity: ${severity.score}/10 (${severity.label})
- Urgency: ${severity.urgencyText}
- Patient symptoms: "${symptoms}"

Write ONLY a plain text explanation (no JSON, no markdown, no headers).
Be warm, clear, and medically accurate. Do not add new diagnoses.`;
}

/**
 * Main hybrid routing function
 */
export async function hybridSymptomCheck(
  symptoms: string,
  patientHistory?: string,
  answers?: { question: string; answer: string }[]
): Promise<HybridResult> {
  const startTime = Date.now();

  // ── Step 1: ML Inference ──────────────────────────────────────────────────
  let mlResult: Awaited<ReturnType<typeof runInference>> | null = null;
  let mlFailed = false;

  try {
    mlResult = await runInference(symptoms);
    console.log(
      `[ML] Inference complete: ${mlResult.prediction.topDisease} | ` +
      `confidence=${mlResult.confidence.score.toFixed(2)} | ` +
      `tier=${mlResult.confidence.tier} | ` +
      `${mlResult.inferenceMs}ms`
    );
  } catch (err: any) {
    mlFailed = true;
    console.error('[ML] Inference failed, falling back to AI pipeline:', err.message);
  }

  // ── Step 2: Route by confidence tier ─────────────────────────────────────
  if (!mlFailed && mlResult) {
    const tier = mlResult.confidence.tier;

    // ── HIGH confidence: return ML result directly ──────────────────────────
    if (tier === 'HIGH') {
      console.log(`[ML] HIGH confidence — returning ML result (${mlResult.confidence.tokenSavingEstimate} tokens saved)`);
      return buildMLOnlyResult(mlResult, symptoms);
    }

    // ── MEDIUM confidence: ML prediction + AI explanation only ──────────────
    if (tier === 'MEDIUM') {
      console.log('[ML] MEDIUM confidence — requesting AI explanation only');
      try {
        const explanationPrompt = buildExplanationPrompt(symptoms, mlResult);
        const aiExplanation = await getAIResponse(explanationPrompt, { timeoutMs: 15000 });

        const base = buildMLOnlyResult(mlResult, symptoms);
        return {
          ...base,
          explanation: aiExplanation.trim(),
          source: 'ml_model+ai_explanation',
          layerUsed: `ML Engine + AI Explanation (${(mlResult.confidence.score * 100).toFixed(0)}% confidence)`,
          tokensSaved: mlResult.confidence.tokenSavingEstimate,
        };
      } catch (aiErr: any) {
        console.warn('[ML] AI explanation failed, using ML-only explanation:', aiErr.message);
        return buildMLOnlyResult(mlResult, symptoms);
      }
    }
  }

  // ── Step 3: LOW confidence or ML failure → Full AI pipeline ──────────────
  console.log('[ML] LOW confidence or ML failure — escalating to full AI pipeline');

  const historyBlock = patientHistory
    ? `\n\n${patientHistory}\n\nConsider the patient's medical history when analyzing current symptoms.\n`
    : '';

  const answersBlock =
    answers && answers.length > 0
      ? `\n\nThe patient also answered these follow-up questions:\n${answers
          .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer || '(skipped)'}`)
          .join('\n')}\n\nUse these answers to improve accuracy.\n`
      : '';

  // Include ML hints in the AI prompt when available (even if low confidence)
  const mlHintBlock = mlResult
    ? `\n\nML pre-analysis hint (low confidence, use as reference only):\n` +
      `- Possible condition: ${mlResult.prediction.topDisease}\n` +
      `- Matched symptoms: ${mlResult.prediction.matchedTerms.join(', ')}\n`
    : '';

  const fullPrompt = `You are a medical AI assistant. A patient reports the following symptoms: "${symptoms}"${historyBlock}${answersBlock}${mlHintBlock}

Analyze these symptoms and respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "severity": <number from 1 to 10>,
  "explanation": "<brief explanation of the symptoms and their implications>",
  "recommendation": "<'home' if manageable at home, or 'consult' if a doctor visit is needed>",
  "possibleConditions": ["<condition1>", "<condition2>"]
}

Rules:
- severity 1-3: mild, home care sufficient
- severity 4-6: moderate, monitor closely
- severity 7-10: severe, consult a doctor immediately
- recommendation must be exactly 'home' or 'consult'`;

  try {
    const text = await getAIResponse(fullPrompt);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    parsed.severity = Math.min(10, Math.max(1, Math.round(parsed.severity)));
    if (parsed.recommendation !== 'home' && parsed.recommendation !== 'consult') {
      parsed.recommendation = parsed.severity >= 5 ? 'consult' : 'home';
    }

    const totalMs = Date.now() - startTime;

    return {
      ...parsed,
      source: 'ai_fallback',
      mlConfidence: mlResult?.confidence.score ?? 0,
      mlConfidenceTier: mlResult?.confidence.tier ?? 'N/A',
      mlDisease: mlResult?.prediction.topDisease ?? 'N/A',
      mlCategory: mlResult?.prediction.category ?? 'N/A',
      mlIcd10: mlResult?.prediction.icd10 ?? 'N/A',
      mlUrgency: mlResult?.prediction.urgency ?? 'N/A',
      severityLabel: parsed.severity <= 3 ? 'low' : parsed.severity <= 6 ? 'medium' : parsed.severity <= 8 ? 'high' : 'emergency',
      emergencyFlag: parsed.severity >= 9,
      structuredRecommendations: [],
      warningFlags: [],
      followUpIn: parsed.severity >= 7 ? 'Within 24 hours' : 'Within 1 week if symptoms persist',
      fallbackUsed: true,
      inferenceMs: totalMs,
      tokensSaved: 0,
      layerUsed: 'AI Reasoning Pipeline (Gemini/Grok)',
    };
  } catch (err) {
    if (err instanceof AIAllProvidersFailedError) {
      console.warn('[ML] All AI providers failed — using offline fallback');
      const offlineResult = offlineSymptomCheck(symptoms);
      const totalMs = Date.now() - startTime;

      return {
        ...offlineResult,
        source: 'offline_fallback',
        mlConfidence: mlResult?.confidence.score ?? 0,
        mlConfidenceTier: mlResult?.confidence.tier ?? 'N/A',
        mlDisease: mlResult?.prediction.topDisease ?? 'N/A',
        mlCategory: mlResult?.prediction.category ?? 'N/A',
        mlIcd10: mlResult?.prediction.icd10 ?? 'N/A',
        mlUrgency: mlResult?.prediction.urgency ?? 'N/A',
        severityLabel: offlineResult.severity <= 3 ? 'low' : offlineResult.severity <= 6 ? 'medium' : offlineResult.severity <= 8 ? 'high' : 'emergency',
        emergencyFlag: offlineResult.severity >= 9,
        structuredRecommendations: [],
        warningFlags: [],
        followUpIn: 'Consult a doctor as soon as possible',
        fallbackUsed: true,
        inferenceMs: totalMs,
        tokensSaved: 0,
        layerUsed: 'Offline Fallback Model',
      };
    }
    throw err;
  }
}
