/**
 * Model Loader
 * Manages lazy loading, caching, and health status of the ML model.
 * Implements async inference with timeout protection.
 */

import { runMLPrediction, MLPrediction } from './predictor';
import { evaluateConfidence, ConfidenceResult } from './confidence';
import { computeSeverity, SeverityResult } from './severity';
import { generateRecommendations, RecommendationResult } from './recommendationEngine';

export interface ModelStatus {
  loaded: boolean;
  loadedAt: string | null;
  inferenceCount: number;
  avgInferenceMs: number;
  lastError: string | null;
}

export interface MLInferenceResult {
  prediction: MLPrediction;
  confidence: ConfidenceResult;
  severity: SeverityResult;
  recommendations: RecommendationResult;
  inferenceMs: number;
}

// ── Model state (singleton) ──────────────────────────────────────────────────
let modelStatus: ModelStatus = {
  loaded: false,
  loadedAt: null,
  inferenceCount: 0,
  avgInferenceMs: 0,
  lastError: null,
};

const INFERENCE_TIMEOUT_MS = 5000; // 5 second timeout for ML inference

/**
 * Initialize / warm up the ML model (lazy loading)
 */
export async function loadModel(): Promise<void> {
  if (modelStatus.loaded) return;

  try {
    // Warm-up inference to pre-compile regex patterns and load vocabulary
    const warmupSymptoms = 'headache fever cough';
    runMLPrediction(warmupSymptoms);

    modelStatus.loaded = true;
    modelStatus.loadedAt = new Date().toISOString();
    modelStatus.lastError = null;
    console.log('[ML] Model loaded and warmed up successfully');
  } catch (err: any) {
    modelStatus.lastError = err.message;
    console.error('[ML] Model load failed:', err.message);
    throw err;
  }
}

/**
 * Run inference with timeout protection and metrics tracking
 */
export async function runInference(symptoms: string): Promise<MLInferenceResult> {
  // Ensure model is loaded
  if (!modelStatus.loaded) {
    await loadModel();
  }

  const startTime = Date.now();

  const inferencePromise = new Promise<MLInferenceResult>((resolve, reject) => {
    try {
      const prediction = runMLPrediction(symptoms);
      const confidence = evaluateConfidence(prediction);
      const severity = computeSeverity(prediction);
      const recommendations = generateRecommendations(prediction, severity);

      resolve({ prediction, confidence, severity, recommendations, inferenceMs: 0 });
    } catch (err: any) {
      reject(err);
    }
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`ML inference timed out after ${INFERENCE_TIMEOUT_MS}ms`)),
      INFERENCE_TIMEOUT_MS
    )
  );

  const result = await Promise.race([inferencePromise, timeoutPromise]);
  const inferenceMs = Date.now() - startTime;

  // Update metrics
  modelStatus.inferenceCount++;
  modelStatus.avgInferenceMs = parseFloat(
    (
      (modelStatus.avgInferenceMs * (modelStatus.inferenceCount - 1) + inferenceMs) /
      modelStatus.inferenceCount
    ).toFixed(2)
  );

  return { ...result, inferenceMs };
}

/**
 * Get current model health status
 */
export function getModelStatus(): ModelStatus {
  return { ...modelStatus };
}

/**
 * Reset model (for testing / recovery)
 */
export function resetModel(): void {
  modelStatus = {
    loaded: false,
    loadedAt: null,
    inferenceCount: 0,
    avgInferenceMs: 0,
    lastError: null,
  };
}
