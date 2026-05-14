/**
 * Symptom Checker Controller
 * Handles the hybrid ML + AI symptom checking endpoints.
 * Isolated from other AI modules — does NOT affect Delulu or other AI features.
 */

import { Request, Response } from 'express';
import { hybridSymptomCheck } from '../ml/mlRouter';
import { runInference } from '../ml/modelLoader';
import { getModelStatus } from '../ml/modelLoader';
import { sanitizeForAI } from '../utils/aiSanitizer';
import { storeSymptomCheck } from '../utils/memoryService';
import { buildEnrichedPrompt, logInteraction, getEvolutionLevel } from '../services/insightEngine';
import { generateFollowUpQuestionsAI } from '../utils/followUpQuestions';

// ── Logging helper ────────────────────────────────────────────────────────────
function logHybridResult(result: Awaited<ReturnType<typeof hybridSymptomCheck>>, inferenceMs: number) {
  console.log(
    `[SymptomChecker] Layer: ${result.layerUsed} | ` +
    `Source: ${result.source} | ` +
    `Confidence: ${(result.mlConfidence * 100).toFixed(0)}% | ` +
    `Severity: ${result.severity}/10 (${result.severityLabel}) | ` +
    `Fallback: ${result.fallbackUsed} | ` +
    `Tokens saved: ~${result.tokensSaved} | ` +
    `Time: ${inferenceMs}ms`
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/symptom-checker/hybrid-predict
   Main hybrid endpoint — ML first, AI fallback chain second
═══════════════════════════════════════════════════════════════════════════ */
export const hybridPredict = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const { userId } = req.body;

    // Sanitize input (strips PII)
    let sanitizedData;
    try {
      sanitizedData = sanitizeForAI(req.body);
    } catch (sanitizeErr: any) {
      res.status(sanitizeErr.statusCode || 400).json({
        success: false,
        message: sanitizeErr.message,
      });
      return;
    }
    const { symptoms } = sanitizedData;

    // Fetch enriched patient history for AI fallback context
    let patientHistory = '';
    if (userId) {
      patientHistory = await buildEnrichedPrompt(userId, symptoms, 'symptom_check');
    }

    // Parse follow-up answers
    const answers: { question: string; answer: string }[] = Array.isArray(req.body.answers)
      ? req.body.answers
      : [];

    // ── Run hybrid pipeline ──────────────────────────────────────────────────
    const result = await hybridSymptomCheck(
      symptoms,
      patientHistory || undefined,
      answers.length > 0 ? answers : undefined
    );

    const totalMs = Date.now() - startTime;
    logHybridResult(result, totalMs);

    // Store in memory (isolated to symptom checker)
    if (userId) {
      storeSymptomCheck(userId, symptoms.trim(), result).catch(() => {});
    }

    // Log interaction for continuous learning
    if (userId) {
      logInteraction(
        userId,
        'symptom_check',
        symptoms.trim(),
        `Severity: ${result.severity}/10. ${result.explanation}`,
        {
          severity: result.severity,
          conditions: result.possibleConditions || [],
          mlSource: result.source,
          mlConfidence: result.mlConfidence,
        } as any
      ).catch(() => {});
    }

    // Fetch evolution level
    let evolution = null;
    if (userId) {
      evolution = await getEvolutionLevel(userId).catch(() => null);
    }

    res.status(200).json({
      success: true,
      data: result,
      memoryActive: !!patientHistory,
      evolution,
      meta: {
        source: result.source,
        mlConfidence: result.mlConfidence,
        mlConfidenceTier: result.mlConfidenceTier,
        layerUsed: result.layerUsed,
        inferenceMs: totalMs,
        tokensSaved: result.tokensSaved,
        fallbackUsed: result.fallbackUsed,
      },
    });
  } catch (error: any) {
    console.error('[SymptomChecker] hybridPredict error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Hybrid symptom analysis failed',
      error: error.message,
    });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/symptom-checker/ml-only
   ML-only endpoint — returns raw ML prediction without AI fallback
═══════════════════════════════════════════════════════════════════════════ */
export const mlOnlyPredict = async (req: Request, res: Response): Promise<void> => {
  try {
    let sanitizedData;
    try {
      sanitizedData = sanitizeForAI(req.body);
    } catch (sanitizeErr: any) {
      res.status(sanitizeErr.statusCode || 400).json({
        success: false,
        message: sanitizeErr.message,
      });
      return;
    }
    const { symptoms } = sanitizedData;

    const result = await runInference(symptoms);

    res.status(200).json({
      success: true,
      data: {
        source: 'ml_model',
        disease: result.prediction.topDisease,
        category: result.prediction.category,
        icd10: result.prediction.icd10,
        confidence: result.confidence.score,
        confidenceTier: result.confidence.tier,
        confidenceReasoning: result.confidence.reasoning,
        severity: result.severity.score,
        severityLabel: result.severity.label,
        urgency: result.severity.urgencyText,
        emergencyFlag: result.severity.emergencyFlag,
        recommendations: result.recommendations.recommendations,
        warningFlags: result.recommendations.warningFlags,
        followUpIn: result.recommendations.followUpIn,
        candidates: result.prediction.candidates,
        matchedTerms: result.prediction.matchedTerms,
        inferenceMs: result.inferenceMs,
        fallbackUsed: false,
      },
    });
  } catch (error: any) {
    console.error('[SymptomChecker] mlOnlyPredict error:', error.message);
    res.status(500).json({
      success: false,
      message: 'ML prediction failed',
      error: error.message,
    });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/symptom-checker/model-health
   Model health check endpoint
═══════════════════════════════════════════════════════════════════════════ */
export const modelHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = getModelStatus();

    res.status(200).json({
      success: true,
      model: {
        status: status.loaded ? 'healthy' : 'not_loaded',
        loadedAt: status.loadedAt,
        inferenceCount: status.inferenceCount,
        avgInferenceMs: status.avgInferenceMs,
        lastError: status.lastError,
      },
      pipeline: {
        layers: ['ML Engine', 'Gemini AI', 'Grok AI', 'Offline Fallback'],
        thresholds: {
          high: '≥ 0.85 → ML only (zero AI tokens)',
          medium: '0.60–0.84 → ML + AI explanation',
          low: '< 0.60 → Full AI pipeline',
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get model health',
      error: error.message,
    });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/symptom-checker/generate-questions
   Generate follow-up questions (proxied from AI module, isolated)
═══════════════════════════════════════════════════════════════════════════ */
export const generateQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === '') {
      res.status(400).json({
        success: false,
        message: '"symptoms" is required and must be a non-empty string',
      });
      return;
    }

    const questions = await generateFollowUpQuestionsAI(symptoms.trim());
    const safeQuestions = (questions || []).slice(0, 5);

    res.status(200).json({ success: true, questions: safeQuestions });
  } catch (error: any) {
    console.error('[SymptomChecker] generateQuestions error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate follow-up questions',
      error: error.message,
    });
  }
};
