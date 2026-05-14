/**
 * ML Predictor
 * Core prediction engine that scores symptom vectors against disease profiles
 * using weighted term matching and probabilistic scoring.
 */

import { vectorizeSymptoms, cosineSimilarity, SymptomVector } from './symptomVectorizer';
import { DISEASE_PROFILES, DiseaseProfile } from './diseaseMapper';

export interface PredictionCandidate {
  disease: DiseaseProfile;
  score: number;           // Raw match score 0–1
  matchedPrimary: string[];
  matchedSecondary: string[];
  severityBoost: number;   // Additional severity from modifier matches
}

export interface MLPrediction {
  topDisease: string;
  category: string;
  icd10: string;
  rawScore: number;
  candidates: Array<{
    disease: string;
    score: number;
    matchedSymptoms: string[];
  }>;
  baseSeverity: number;
  severityBoost: number;
  urgency: string;
  matchedTerms: string[];
}

const PRIMARY_WEIGHT   = 1.0;
const SECONDARY_WEIGHT = 0.4;
const MODIFIER_WEIGHT  = 0.3;

/**
 * Score a single disease profile against the symptom vector
 */
function scoreDisease(
  vec: SymptomVector,
  disease: DiseaseProfile
): PredictionCandidate {
  const lowerText = vec.rawText.toLowerCase();
  const matchedPrimary: string[] = [];
  const matchedSecondary: string[] = [];
  let severityBoost = 0;
  let score = 0;

  // Primary symptom matching (high weight)
  for (const sym of disease.primarySymptoms) {
    if (lowerText.includes(sym) || vec.terms.some(t => t.includes(sym) || sym.includes(t))) {
      matchedPrimary.push(sym);
      // Weight by IDF from vectorizer
      const termWeight = vec.weights[vec.terms.indexOf(sym)] ?? 1.0;
      score += PRIMARY_WEIGHT * termWeight;
    }
  }

  // Secondary symptom matching (lower weight)
  for (const sym of disease.secondarySymptoms) {
    if (lowerText.includes(sym) || vec.terms.some(t => t.includes(sym) || sym.includes(t))) {
      matchedSecondary.push(sym);
      score += SECONDARY_WEIGHT;
    }
  }

  // Severity modifier matching
  for (const mod of disease.severityModifiers) {
    if (lowerText.includes(mod)) {
      severityBoost += MODIFIER_WEIGHT;
    }
  }

  // Normalize score by total possible primary matches
  const maxPossibleScore =
    disease.primarySymptoms.length * PRIMARY_WEIGHT * 2.5 +
    disease.secondarySymptoms.length * SECONDARY_WEIGHT;

  const normalizedScore = maxPossibleScore > 0
    ? Math.min(1, score / maxPossibleScore)
    : 0;

  return {
    disease,
    score: normalizedScore,
    matchedPrimary,
    matchedSecondary,
    severityBoost: Math.min(2, severityBoost),
  };
}

/**
 * Run ML prediction on symptom text
 */
export function runMLPrediction(symptoms: string): MLPrediction {
  const vec = vectorizeSymptoms(symptoms);

  // Score all disease profiles
  const candidates = DISEASE_PROFILES
    .map(disease => scoreDisease(vec, disease))
    .filter(c => c.score > 0 || c.matchedPrimary.length > 0)
    .sort((a, b) => b.score - a.score);

  // If no matches at all, return a low-confidence generic result
  if (candidates.length === 0) {
    return {
      topDisease: 'Unspecified Condition',
      category: 'General',
      icd10: 'R69',
      rawScore: 0,
      candidates: [],
      baseSeverity: 3,
      severityBoost: 0,
      urgency: 'doctor_visit',
      matchedTerms: vec.terms,
    };
  }

  const top = candidates[0];

  return {
    topDisease: top.disease.name,
    category: top.disease.category,
    icd10: top.disease.icd10,
    rawScore: top.score,
    candidates: candidates.slice(0, 5).map(c => ({
      disease: c.disease.name,
      score: parseFloat(c.score.toFixed(3)),
      matchedSymptoms: [...c.matchedPrimary, ...c.matchedSecondary],
    })),
    baseSeverity: top.disease.baseSeverity,
    severityBoost: top.severityBoost,
    urgency: top.disease.urgency,
    matchedTerms: [...top.matchedPrimary, ...top.matchedSecondary],
  };
}
