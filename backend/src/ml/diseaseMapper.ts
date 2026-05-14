/**
 * Disease Mapper
 * Maps symptom patterns to disease profiles using a curated medical knowledge base.
 * Each disease profile contains symptom signatures, severity ranges, and metadata.
 */

export interface DiseaseProfile {
  name: string;
  category: string;
  primarySymptoms: string[];    // High-weight symptom terms
  secondarySymptoms: string[];  // Supporting symptom terms
  baseSeverity: number;         // 1–10 baseline severity
  severityModifiers: string[];  // Terms that increase severity
  urgency: 'home_care' | 'doctor_visit' | 'urgent_care' | 'emergency';
  icd10: string;                // ICD-10 code for reference
}

export const DISEASE_PROFILES: DiseaseProfile[] = [
  // ── Cardiovascular ──────────────────────────────────────────────────────────
  {
    name: 'Acute Coronary Syndrome',
    category: 'Cardiovascular',
    primarySymptoms: ['chest pain', 'chest pressure', 'chest tightness'],
    secondarySymptoms: ['shortness of breath', 'palpitations', 'sweating', 'nausea', 'arm pain'],
    baseSeverity: 9,
    severityModifiers: ['radiating', 'crushing', 'left arm', 'jaw pain', 'sweating'],
    urgency: 'emergency',
    icd10: 'I24.9',
  },
  {
    name: 'Arrhythmia',
    category: 'Cardiovascular',
    primarySymptoms: ['palpitations', 'palpitation', 'irregular heartbeat', 'heart racing'],
    secondarySymptoms: ['dizziness', 'shortness of breath', 'chest discomfort', 'fatigue'],
    baseSeverity: 6,
    severityModifiers: ['fainting', 'syncope', 'chest pain', 'severe'],
    urgency: 'urgent_care',
    icd10: 'I49.9',
  },

  // ── Respiratory ─────────────────────────────────────────────────────────────
  {
    name: 'Pneumonia',
    category: 'Respiratory',
    primarySymptoms: ['cough', 'fever', 'difficulty breathing'],
    secondarySymptoms: ['chest pain', 'fatigue', 'chills', 'shortness of breath'],
    baseSeverity: 7,
    severityModifiers: ['high fever', 'blood in sputum', 'severe', 'elderly', 'confusion'],
    urgency: 'urgent_care',
    icd10: 'J18.9',
  },
  {
    name: 'Asthma Attack',
    category: 'Respiratory',
    primarySymptoms: ['wheezing', 'difficulty breathing', 'breathlessness'],
    secondarySymptoms: ['cough', 'chest tightness', 'shortness of breath'],
    baseSeverity: 7,
    severityModifiers: ['severe', 'unable to speak', 'blue lips', 'not responding to inhaler'],
    urgency: 'urgent_care',
    icd10: 'J45.901',
  },
  {
    name: 'Upper Respiratory Infection',
    category: 'Respiratory',
    primarySymptoms: ['cough', 'sore throat', 'runny nose', 'nasal congestion'],
    secondarySymptoms: ['sneezing', 'mild fever', 'fatigue', 'hoarseness'],
    baseSeverity: 3,
    severityModifiers: ['high fever', 'difficulty breathing', 'persistent'],
    urgency: 'home_care',
    icd10: 'J06.9',
  },
  {
    name: 'Influenza',
    category: 'Respiratory',
    primarySymptoms: ['fever', 'cough', 'fatigue', 'muscle pain'],
    secondarySymptoms: ['headache', 'chills', 'sore throat', 'runny nose'],
    baseSeverity: 5,
    severityModifiers: ['high fever', 'difficulty breathing', 'severe fatigue', 'elderly'],
    urgency: 'doctor_visit',
    icd10: 'J11.1',
  },

  // ── Neurological ────────────────────────────────────────────────────────────
  {
    name: 'Stroke / TIA',
    category: 'Neurological',
    primarySymptoms: ['facial drooping', 'sudden weakness', 'stroke'],
    secondarySymptoms: ['confusion', 'slurred speech', 'vision loss', 'severe headache', 'numbness'],
    baseSeverity: 10,
    severityModifiers: ['sudden onset', 'one side', 'cannot speak'],
    urgency: 'emergency',
    icd10: 'I63.9',
  },
  {
    name: 'Migraine',
    category: 'Neurological',
    primarySymptoms: ['migraine', 'headache'],
    secondarySymptoms: ['nausea', 'vomiting', 'light sensitivity', 'blurred vision', 'dizziness'],
    baseSeverity: 5,
    severityModifiers: ['severe', 'worst headache', 'sudden onset', 'fever', 'stiff neck'],
    urgency: 'doctor_visit',
    icd10: 'G43.909',
  },
  {
    name: 'Tension Headache',
    category: 'Neurological',
    primarySymptoms: ['headache'],
    secondarySymptoms: ['neck pain', 'stress', 'fatigue'],
    baseSeverity: 3,
    severityModifiers: ['severe', 'persistent', 'daily'],
    urgency: 'home_care',
    icd10: 'G44.209',
  },
  {
    name: 'Vertigo',
    category: 'Neurological',
    primarySymptoms: ['vertigo', 'dizziness'],
    secondarySymptoms: ['nausea', 'vomiting', 'ear pain', 'tinnitus', 'hearing loss'],
    baseSeverity: 4,
    severityModifiers: ['sudden onset', 'severe', 'fainting', 'chest pain'],
    urgency: 'doctor_visit',
    icd10: 'H81.39',
  },

  // ── Gastrointestinal ────────────────────────────────────────────────────────
  {
    name: 'Gastroenteritis',
    category: 'Gastrointestinal',
    primarySymptoms: ['nausea', 'vomiting', 'diarrhea'],
    secondarySymptoms: ['stomach pain', 'abdominal pain', 'fever', 'fatigue', 'dehydration'],
    baseSeverity: 4,
    severityModifiers: ['blood in stool', 'severe dehydration', 'high fever', 'persistent'],
    urgency: 'home_care',
    icd10: 'K59.1',
  },
  {
    name: 'Appendicitis',
    category: 'Gastrointestinal',
    primarySymptoms: ['abdominal pain', 'stomach pain'],
    secondarySymptoms: ['nausea', 'vomiting', 'fever', 'loss of appetite'],
    baseSeverity: 8,
    severityModifiers: ['right lower', 'severe', 'rebound tenderness', 'rigid abdomen'],
    urgency: 'emergency',
    icd10: 'K37',
  },
  {
    name: 'Acid Reflux / GERD',
    category: 'Gastrointestinal',
    primarySymptoms: ['heartburn', 'acid reflux'],
    secondarySymptoms: ['chest pain', 'nausea', 'bloating', 'sore throat'],
    baseSeverity: 3,
    severityModifiers: ['severe', 'blood in vomit', 'difficulty swallowing'],
    urgency: 'home_care',
    icd10: 'K21.0',
  },

  // ── Musculoskeletal ─────────────────────────────────────────────────────────
  {
    name: 'Musculoskeletal Strain',
    category: 'Musculoskeletal',
    primarySymptoms: ['back pain', 'muscle pain', 'neck pain'],
    secondarySymptoms: ['stiffness', 'weakness', 'limited range of motion'],
    baseSeverity: 3,
    severityModifiers: ['severe', 'radiating', 'numbness', 'tingling', 'trauma'],
    urgency: 'home_care',
    icd10: 'M54.5',
  },
  {
    name: 'Arthritis',
    category: 'Musculoskeletal',
    primarySymptoms: ['joint pain', 'arthritis', 'swollen joint'],
    secondarySymptoms: ['stiffness', 'knee pain', 'shoulder pain', 'fatigue'],
    baseSeverity: 4,
    severityModifiers: ['severe', 'multiple joints', 'fever', 'rapid onset'],
    urgency: 'doctor_visit',
    icd10: 'M13.9',
  },

  // ── Systemic / Infectious ───────────────────────────────────────────────────
  {
    name: 'Viral Fever',
    category: 'Infectious',
    primarySymptoms: ['fever', 'fatigue'],
    secondarySymptoms: ['headache', 'muscle pain', 'chills', 'weakness'],
    baseSeverity: 4,
    severityModifiers: ['high fever', 'persistent', 'rash', 'confusion'],
    urgency: 'doctor_visit',
    icd10: 'A99',
  },
  {
    name: 'Dengue Fever',
    category: 'Infectious',
    primarySymptoms: ['high fever', 'fever', 'rash'],
    secondarySymptoms: ['severe headache', 'joint pain', 'muscle pain', 'fatigue', 'nausea'],
    baseSeverity: 7,
    severityModifiers: ['bleeding', 'severe abdominal pain', 'rapid breathing', 'persistent vomiting'],
    urgency: 'urgent_care',
    icd10: 'A90',
  },
  {
    name: 'Urinary Tract Infection',
    category: 'Urological',
    primarySymptoms: ['painful urination', 'frequent urination', 'urinary tract infection'],
    secondarySymptoms: ['burning sensation', 'lower abdominal pain', 'fever', 'blood in urine'],
    baseSeverity: 4,
    severityModifiers: ['high fever', 'kidney pain', 'blood in urine', 'severe'],
    urgency: 'doctor_visit',
    icd10: 'N39.0',
  },

  // ── Endocrine ───────────────────────────────────────────────────────────────
  {
    name: 'Diabetes (Uncontrolled)',
    category: 'Endocrine',
    primarySymptoms: ['excessive thirst', 'frequent urination', 'diabetes'],
    secondarySymptoms: ['excessive hunger', 'fatigue', 'blurred vision', 'weight loss'],
    baseSeverity: 6,
    severityModifiers: ['confusion', 'fruity breath', 'rapid breathing', 'unconscious'],
    urgency: 'doctor_visit',
    icd10: 'E11.9',
  },

  // ── Mental Health ───────────────────────────────────────────────────────────
  {
    name: 'Panic Disorder',
    category: 'Mental Health',
    primarySymptoms: ['panic attack', 'anxiety'],
    secondarySymptoms: ['palpitations', 'shortness of breath', 'chest pain', 'dizziness', 'sweating'],
    baseSeverity: 5,
    severityModifiers: ['severe', 'frequent', 'suicidal', 'self-harm'],
    urgency: 'doctor_visit',
    icd10: 'F41.0',
  },

  // ── Allergic ────────────────────────────────────────────────────────────────
  {
    name: 'Allergic Reaction',
    category: 'Immunological',
    primarySymptoms: ['rash', 'hives', 'itching'],
    secondarySymptoms: ['swelling', 'runny nose', 'sneezing', 'watery eyes'],
    baseSeverity: 3,
    severityModifiers: ['throat swelling', 'difficulty breathing', 'anaphylaxis', 'severe'],
    urgency: 'home_care',
    icd10: 'T78.40',
  },
  {
    name: 'Anaphylaxis',
    category: 'Immunological',
    primarySymptoms: ['throat swelling', 'difficulty breathing', 'hives'],
    secondarySymptoms: ['swelling', 'rash', 'dizziness', 'low blood pressure'],
    baseSeverity: 10,
    severityModifiers: ['severe', 'rapid onset', 'unconscious'],
    urgency: 'emergency',
    icd10: 'T78.2',
  },
];

/**
 * Get all disease profiles
 */
export function getAllDiseaseProfiles(): DiseaseProfile[] {
  return DISEASE_PROFILES;
}

/**
 * Get disease profile by name
 */
export function getDiseaseByName(name: string): DiseaseProfile | undefined {
  return DISEASE_PROFILES.find(d => d.name.toLowerCase() === name.toLowerCase());
}
