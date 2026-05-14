/**
 * Symptom Vectorizer
 * Converts raw symptom text into a normalized feature vector
 * using TF-IDF-style term weighting against a medical vocabulary.
 */

// Medical symptom vocabulary with IDF weights (higher = more discriminative)
const SYMPTOM_VOCABULARY: Record<string, number> = {
  // Cardiovascular
  'chest pain': 2.8, 'chest pressure': 2.8, 'chest tightness': 2.7,
  'palpitation': 2.5, 'palpitations': 2.5, 'heart racing': 2.4,
  'irregular heartbeat': 2.6, 'shortness of breath': 2.3,

  // Neurological
  'headache': 1.5, 'migraine': 2.0, 'dizziness': 1.8, 'vertigo': 2.2,
  'confusion': 2.5, 'seizure': 2.9, 'numbness': 2.1, 'tingling': 1.9,
  'facial drooping': 3.0, 'sudden weakness': 2.8, 'stroke': 3.0,
  'memory loss': 2.4, 'blurred vision': 2.0,

  // Respiratory
  'cough': 1.2, 'dry cough': 1.5, 'wet cough': 1.6, 'wheezing': 2.2,
  'difficulty breathing': 2.6, 'breathlessness': 2.4, 'asthma': 2.3,
  'sore throat': 1.3, 'runny nose': 1.1, 'nasal congestion': 1.2,
  'sneezing': 1.0, 'hoarseness': 1.6,

  // Gastrointestinal
  'nausea': 1.4, 'vomiting': 1.7, 'diarrhea': 1.5, 'constipation': 1.4,
  'stomach pain': 1.6, 'abdominal pain': 1.8, 'bloating': 1.3,
  'heartburn': 1.5, 'acid reflux': 1.6, 'loss of appetite': 1.7,
  'blood in stool': 2.8, 'jaundice': 2.6,

  // Musculoskeletal
  'back pain': 1.4, 'joint pain': 1.7, 'muscle pain': 1.5,
  'knee pain': 1.6, 'neck pain': 1.5, 'shoulder pain': 1.5,
  'swollen joint': 2.0, 'stiffness': 1.6, 'arthritis': 1.9,

  // Systemic / General
  'fever': 1.6, 'high fever': 2.2, 'chills': 1.7, 'fatigue': 1.3,
  'weakness': 1.5, 'weight loss': 2.1, 'night sweats': 2.0,
  'swollen lymph nodes': 2.3, 'rash': 1.6, 'itching': 1.4,
  'hives': 1.8, 'swelling': 1.6, 'dehydration': 1.8,

  // Urological / Renal
  'frequent urination': 1.8, 'painful urination': 2.0, 'blood in urine': 2.7,
  'kidney pain': 2.2, 'urinary tract infection': 2.0,

  // Endocrine / Metabolic
  'excessive thirst': 2.0, 'excessive hunger': 1.9, 'diabetes': 2.1,
  'thyroid': 2.0, 'weight gain': 1.5,

  // Mental Health
  'anxiety': 1.7, 'panic attack': 2.2, 'depression': 1.8,
  'insomnia': 1.6, 'stress': 1.3,

  // ENT
  'ear pain': 1.7, 'hearing loss': 2.0, 'tinnitus': 2.0,
  'eye pain': 1.9, 'red eye': 1.7,

  // Dermatological
  'acne': 1.2, 'eczema': 1.8, 'psoriasis': 2.0, 'skin lesion': 2.2,
};

export interface SymptomVector {
  terms: string[];
  weights: number[];
  magnitude: number;
  rawText: string;
}

/**
 * Tokenize and normalize symptom text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

/**
 * Extract matched vocabulary terms from symptom text (multi-word first)
 */
function extractTerms(text: string): Map<string, number> {
  const lower = text.toLowerCase();
  const matched = new Map<string, number>();

  // Multi-word terms first (longer matches take priority)
  const sortedVocab = Object.keys(SYMPTOM_VOCABULARY).sort(
    (a, b) => b.split(' ').length - a.split(' ').length
  );

  for (const term of sortedVocab) {
    if (lower.includes(term)) {
      matched.set(term, SYMPTOM_VOCABULARY[term]);
    }
  }

  // Single token fallback for unmatched tokens
  const tokens = tokenize(text);
  for (const token of tokens) {
    if (!Array.from(matched.keys()).some(t => t.includes(token))) {
      // Partial match against vocabulary
      for (const [vocabTerm, weight] of Object.entries(SYMPTOM_VOCABULARY)) {
        if (vocabTerm.includes(token) && !matched.has(vocabTerm)) {
          matched.set(vocabTerm, weight * 0.6); // partial match penalty
        }
      }
    }
  }

  return matched;
}

/**
 * Build a normalized symptom vector from raw text
 */
export function vectorizeSymptoms(rawText: string): SymptomVector {
  const termMap = extractTerms(rawText);
  const terms = Array.from(termMap.keys());
  const weights = Array.from(termMap.values());

  // L2 normalization
  const magnitude = Math.sqrt(weights.reduce((sum, w) => sum + w * w, 0)) || 1;

  return { terms, weights, magnitude, rawText };
}

/**
 * Cosine similarity between two vectors (by term overlap)
 */
export function cosineSimilarity(
  vecA: SymptomVector,
  vecB: SymptomVector
): number {
  let dotProduct = 0;

  for (let i = 0; i < vecA.terms.length; i++) {
    const termA = vecA.terms[i];
    const idxB = vecB.terms.indexOf(termA);
    if (idxB !== -1) {
      dotProduct += (vecA.weights[i] / vecA.magnitude) * (vecB.weights[idxB] / vecB.magnitude);
    }
  }

  return Math.min(1, dotProduct);
}
