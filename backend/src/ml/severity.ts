/**
 * Severity Scorer
 * Computes a final severity score (1–10) and severity label
 * from the ML prediction, applying contextual modifiers.
 */

import { MLPrediction } from './predictor';

export type SeverityLabel = 'low' | 'medium' | 'high' | 'emergency';

export interface SeverityResult {
  score: number;          // 1–10
  label: SeverityLabel;
  urgencyText: string;    // Human-readable urgency
  emergencyFlag: boolean;
}

/**
 * Map urgency string to severity label
 */
function urgencyToLabel(urgency: string): SeverityLabel {
  switch (urgency) {
    case 'emergency':   return 'emergency';
    case 'urgent_care': return 'high';
    case 'doctor_visit': return 'medium';
    default:            return 'low';
  }
}

/**
 * Map urgency to human-readable text
 */
function urgencyToText(urgency: string): string {
  switch (urgency) {
    case 'emergency':    return 'Seek emergency care immediately';
    case 'urgent_care':  return 'Visit urgent care within 24 hours';
    case 'doctor_visit': return 'Schedule a doctor visit soon';
    default:             return 'Monitor at home; see a doctor if symptoms worsen';
  }
}

/**
 * Compute final severity from ML prediction
 */
export function computeSeverity(prediction: MLPrediction): SeverityResult {
  // Base severity from disease profile
  let score = prediction.baseSeverity;

  // Apply severity boost from modifier matches
  score = Math.min(10, score + prediction.severityBoost);

  // Clamp to valid range
  score = Math.max(1, Math.min(10, Math.round(score)));

  const label = urgencyToLabel(prediction.urgency);
  const urgencyText = urgencyToText(prediction.urgency);
  const emergencyFlag = label === 'emergency' || score >= 9;

  return { score, label, urgencyText, emergencyFlag };
}
