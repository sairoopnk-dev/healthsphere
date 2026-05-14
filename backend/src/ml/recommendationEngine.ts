/**
 * Recommendation Engine
 * Generates structured care recommendations based on ML prediction and severity.
 */

import { MLPrediction } from './predictor';
import { SeverityResult } from './severity';

export interface RecommendationResult {
  careLevel: 'home' | 'consult';
  recommendations: string[];
  warningFlags: string[];
  followUpIn: string;
}

// Disease-specific recommendation templates
const DISEASE_RECOMMENDATIONS: Record<string, string[]> = {
  'Acute Coronary Syndrome': [
    'Call emergency services (911) immediately',
    'Chew aspirin (325mg) if not allergic and no contraindications',
    'Rest and avoid physical exertion',
    'Do not drive yourself to the hospital',
  ],
  'Stroke / TIA': [
    'Call emergency services (911) immediately — time is critical',
    'Note the time symptoms started',
    'Do not give food or water',
    'Keep the person calm and still',
  ],
  'Anaphylaxis': [
    'Use epinephrine auto-injector (EpiPen) if available',
    'Call emergency services immediately',
    'Lie down with legs elevated unless breathing is difficult',
    'Be prepared to administer CPR if needed',
  ],
  'Pneumonia': [
    'Seek medical evaluation promptly',
    'Rest and stay hydrated',
    'Monitor oxygen levels if possible',
    'Take prescribed antibiotics as directed',
  ],
  'Asthma Attack': [
    'Use rescue inhaler (albuterol) immediately',
    'Sit upright and stay calm',
    'Seek emergency care if inhaler is not helping',
    'Avoid known triggers',
  ],
  'Influenza': [
    'Rest and stay hydrated',
    'Take fever-reducing medication (paracetamol/ibuprofen)',
    'Isolate to prevent spreading',
    'Consult a doctor if symptoms worsen or persist beyond 5 days',
  ],
  'Upper Respiratory Infection': [
    'Rest and drink plenty of fluids',
    'Use saline nasal spray for congestion',
    'Honey and warm liquids can soothe sore throat',
    'Over-the-counter decongestants may help',
  ],
  'Gastroenteritis': [
    'Stay hydrated with oral rehydration solution (ORS)',
    'Eat bland foods (BRAT diet: bananas, rice, applesauce, toast)',
    'Avoid dairy, fatty, and spicy foods',
    'Seek care if vomiting persists beyond 24 hours or signs of dehydration appear',
  ],
  'Migraine': [
    'Rest in a dark, quiet room',
    'Apply cold or warm compress to head/neck',
    'Take prescribed migraine medication at onset',
    'Stay hydrated and avoid known triggers',
  ],
  'Tension Headache': [
    'Rest and reduce stress',
    'Over-the-counter pain relievers (paracetamol/ibuprofen)',
    'Apply warm compress to neck and shoulders',
    'Stay hydrated',
  ],
  'Urinary Tract Infection': [
    'Drink plenty of water to flush bacteria',
    'See a doctor for antibiotic prescription',
    'Avoid caffeine and alcohol',
    'Cranberry juice may help prevent recurrence',
  ],
  'Viral Fever': [
    'Rest and stay hydrated',
    'Take paracetamol to reduce fever',
    'Monitor temperature regularly',
    'Seek care if fever exceeds 39.5°C or persists beyond 3 days',
  ],
  'Dengue Fever': [
    'Seek medical evaluation immediately',
    'Stay well hydrated',
    'Avoid aspirin and ibuprofen (risk of bleeding)',
    'Monitor for warning signs: severe abdominal pain, persistent vomiting, bleeding',
  ],
  'Musculoskeletal Strain': [
    'Rest the affected area',
    'Apply ice for first 48 hours, then heat',
    'Over-the-counter pain relievers as needed',
    'Gentle stretching after acute phase',
  ],
  'Arthritis': [
    'Consult a rheumatologist or orthopedist',
    'Low-impact exercise (swimming, walking)',
    'Anti-inflammatory medications as prescribed',
    'Hot/cold therapy for pain relief',
  ],
  'Acid Reflux / GERD': [
    'Avoid trigger foods (spicy, fatty, acidic)',
    'Eat smaller, more frequent meals',
    'Do not lie down within 3 hours of eating',
    'Antacids or H2 blockers may provide relief',
  ],
  'Panic Disorder': [
    'Practice slow, deep breathing (4-7-8 technique)',
    'Consult a mental health professional',
    'Avoid caffeine and alcohol',
    'Regular exercise can reduce anxiety frequency',
  ],
  'Allergic Reaction': [
    'Identify and avoid the allergen',
    'Antihistamines (cetirizine/loratadine) for mild reactions',
    'Seek emergency care if throat swelling or breathing difficulty occurs',
    'Consider allergy testing',
  ],
  'Diabetes (Uncontrolled)': [
    'Monitor blood glucose levels',
    'Follow prescribed medication regimen',
    'Consult your endocrinologist',
    'Maintain a low-glycemic diet',
  ],
  'Vertigo': [
    'Sit or lie down immediately when dizzy',
    'Avoid sudden head movements',
    'Epley maneuver may help for BPPV',
    'Consult an ENT specialist',
  ],
  'Arrhythmia': [
    'Seek medical evaluation',
    'Avoid caffeine, alcohol, and stimulants',
    'Monitor pulse regularly',
    'Follow up with a cardiologist',
  ],
  'Appendicitis': [
    'Seek emergency care immediately',
    'Do not eat or drink anything',
    'Do not apply heat to the abdomen',
    'Surgery may be required',
  ],
};

const DEFAULT_RECOMMENDATIONS = [
  'Monitor your symptoms closely',
  'Stay hydrated and get adequate rest',
  'Consult a healthcare professional if symptoms worsen or persist',
  'Keep a symptom diary to track changes',
];

/**
 * Generate recommendations based on ML prediction and severity
 */
export function generateRecommendations(
  prediction: MLPrediction,
  severity: SeverityResult
): RecommendationResult {
  const diseaseRecs = DISEASE_RECOMMENDATIONS[prediction.topDisease] || DEFAULT_RECOMMENDATIONS;
  const warningFlags: string[] = [];

  // Add warning flags for high-severity conditions
  if (severity.emergencyFlag) {
    warningFlags.push('⚠️ EMERGENCY: Seek immediate medical attention');
  }
  if (severity.score >= 7) {
    warningFlags.push('Do not delay seeking medical care');
  }
  if (prediction.urgency === 'urgent_care') {
    warningFlags.push('Visit urgent care or emergency room within 24 hours');
  }

  // Determine care level
  const careLevel: 'home' | 'consult' =
    severity.score <= 4 && prediction.urgency === 'home_care' ? 'home' : 'consult';

  // Follow-up timing
  let followUpIn: string;
  if (severity.emergencyFlag) followUpIn = 'Immediately — call emergency services';
  else if (severity.score >= 7) followUpIn = 'Within 24 hours';
  else if (severity.score >= 5) followUpIn = 'Within 2–3 days';
  else followUpIn = 'Within 1 week if symptoms persist';

  return {
    careLevel,
    recommendations: diseaseRecs.slice(0, 4),
    warningFlags,
    followUpIn,
  };
}
