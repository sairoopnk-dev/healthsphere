/**
 * Confidence Evaluator
 * Computes a calibrated confidence score from the raw ML prediction
 * and determines which processing tier to use.
 */

import { MLPrediction } from './predictor';

export type ConfidenceTier =
  | 'HIGH'    // >= 0.85 → trust ML fully, skip AI
  | 'MEDIUM'  // 0.60–0.84 → ML + AI explanation formatting only
  | 'LOW';    // < 0.60 → full AI reasoning pipeline

export interface ConfidenceResult {
  score: number;          // 0–1 calibrated confidence
  tier: ConfidenceTier;
  reasoning: string;      // Human-readable explanation of confidence
  tokenSavingEstimate: number; // Estimated tokens saved vs full AI call
}

// Thresholds
const HIGH_THRESHOLD   = 0.85;
const MEDIUM_THRESHOLD = 0.60;

// Estimated token costs
const FULL_AI_TOKENS        = 800;
const EXPLANATION_ONLY_TOKENS = 200;
const ML_ONLY_TOKENS        = 0;

/**
 * Calibrate raw ML score into a confidence score.
 * Applies bonuses for:
 * - Multiple matched primary symptoms
 * - High-severity emergency conditions (we're more conservative)
 * - Candidate separation (gap between top-1 and top-2 scores)
 */
export function evaluateConfidence(prediction: MLPrediction): ConfidenceResult {
  let score = prediction.rawScore;

  // Bonus: multiple primary symptoms matched increases confidence
  const primaryMatchCount = prediction.matchedTerms.filter(t =>
    prediction.candidates[0]?.matchedSymptoms.includes(t)
  ).length;

  if (primaryMatchCount >= 3) score = Math.min(1, score + 0.10);
  else if (primaryMatchCount >= 2) score = Math.min(1, score + 0.05);

  // Bonus: clear separation between top-1 and top-2 candidates
  if (prediction.candidates.length >= 2) {
    const gap = prediction.candidates[0].score - prediction.candidates[1].score;
    if (gap > 0.3) score = Math.min(1, score + 0.08);
    else if (gap < 0.05) score = Math.max(0, score - 0.10); // ambiguous
  }

  // Penalty: emergency conditions — be conservative, prefer AI validation
  if (prediction.urgency === 'emergency') {
    score = Math.min(score, 0.80); // cap at MEDIUM tier for emergencies
  }

  // Penalty: no matched terms at all
  if (prediction.matchedTerms.length === 0) {
    score = 0;
  }

  // Clamp to [0, 1]
  score = Math.max(0, Math.min(1, parseFloat(score.toFixed(3))));

  // Determine tier
  let tier: ConfidenceTier;
  let reasoning: string;
  let tokenSavingEstimate: number;

  if (score >= HIGH_THRESHOLD) {
    tier = 'HIGH';
    reasoning = `ML model matched ${prediction.matchedTerms.length} symptom term(s) with high confidence (${(score * 100).toFixed(0)}%). Returning ML result directly.`;
    tokenSavingEstimate = FULL_AI_TOKENS;
  } else if (score >= MEDIUM_THRESHOLD) {
    tier = 'MEDIUM';
    reasoning = `ML model has moderate confidence (${(score * 100).toFixed(0)}%). Using ML prediction with AI-generated explanation.`;
    tokenSavingEstimate = FULL_AI_TOKENS - EXPLANATION_ONLY_TOKENS;
  } else {
    tier = 'LOW';
    reasoning = `ML confidence too low (${(score * 100).toFixed(0)}%). Escalating to full AI reasoning pipeline.`;
    tokenSavingEstimate = ML_ONLY_TOKENS;
  }

  return { score, tier, reasoning, tokenSavingEstimate };
}
