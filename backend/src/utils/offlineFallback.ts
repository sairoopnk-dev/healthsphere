import type { SymptomCheckResult } from './aiSymptomChecker';
import type { DoctorMatchResult } from './doctorMatcher';
import type { ReportSimplificationResult } from './reportSimplifier';
import type { DietPlanInput, DietPlanResult } from './dietPlanGenerator';

// ─── Symptom keyword rules ───────────────────────────────────────────────────
const SYMPTOM_RULES: Array<{
  keywords: string[];
  severity: number;
  conditions: string[];
  recommendation: 'home' | 'consult';
}> = [
  {
    keywords: ['chest pain', 'chest pressure', 'chest tightness'],
    severity: 9,
    conditions: ['Cardiac Event', 'Angina'],
    recommendation: 'consult',
  },
  {
    keywords: ['difficulty breathing', 'shortness of breath', 'cant breathe'],
    severity: 8,
    conditions: ['Respiratory Distress', 'Asthma'],
    recommendation: 'consult',
  },
  {
    keywords: ['stroke', 'facial drooping', 'sudden weakness'],
    severity: 10,
    conditions: ['Stroke', 'TIA'],
    recommendation: 'consult',
  },
  {
    keywords: ['high fever', 'persistent fever', 'fever above 103'],
    severity: 7,
    conditions: ['Severe Infection', 'Viral Fever'],
    recommendation: 'consult',
  },
  {
    keywords: ['fever', 'temperature'],
    severity: 4,
    conditions: ['Viral Fever', 'Flu', 'Common Cold'],
    recommendation: 'consult',
  },
  {
    keywords: ['headache', 'migraine', 'head pain'],
    severity: 4,
    conditions: ['Tension Headache', 'Migraine'],
    recommendation: 'home',
  },
  {
    keywords: ['cough', 'cold', 'runny nose', 'sore throat'],
    severity: 3,
    conditions: ['Common Cold', 'Upper Respiratory Infection'],
    recommendation: 'home',
  },
  {
    keywords: ['nausea', 'vomiting', 'stomach pain', 'abdominal pain'],
    severity: 4,
    conditions: ['Gastroenteritis', 'Food Poisoning'],
    recommendation: 'home',
  },
  {
    keywords: ['diarrhea', 'loose stools'],
    severity: 3,
    conditions: ['Gastroenteritis', 'IBS'],
    recommendation: 'home',
  },
  {
    keywords: ['fatigue', 'tired', 'weakness', 'exhaustion'],
    severity: 3,
    conditions: ['Fatigue Syndrome', 'Anemia', 'Vitamin Deficiency'],
    recommendation: 'home',
  },
  {
    keywords: ['rash', 'itching', 'skin irritation', 'hives'],
    severity: 3,
    conditions: ['Allergic Reaction', 'Dermatitis'],
    recommendation: 'home',
  },
  {
    keywords: ['back pain', 'lower back', 'spine pain'],
    severity: 3,
    conditions: ['Muscle Strain', 'Lumbar Pain'],
    recommendation: 'home',
  },
  {
    keywords: ['anxiety', 'panic', 'palpitation', 'palpitations'],
    severity: 5,
    conditions: ['Anxiety Disorder', 'Panic Attack'],
    recommendation: 'consult',
  },
  {
    keywords: ['joint pain', 'arthritis', 'knee pain', 'swollen joint'],
    severity: 4,
    conditions: ['Arthritis', 'Joint Inflammation'],
    recommendation: 'consult',
  },
  {
    keywords: ['dizziness', 'vertigo', 'lightheaded'],
    severity: 4,
    conditions: ['Vertigo', 'Low Blood Pressure', 'Inner Ear Issue'],
    recommendation: 'consult',
  },
];

export function offlineSymptomCheck(symptoms: string): SymptomCheckResult {
  const lower = symptoms.toLowerCase();

  for (const rule of SYMPTOM_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return {
        severity: rule.severity,
        explanation: `Based on reported symptoms (${symptoms}), this may suggest ${rule.conditions.join(' or ')}. Please monitor closely and seek medical attention if symptoms worsen or persist beyond 48 hours.`,
        recommendation: rule.recommendation,
        possibleConditions: rule.conditions,
      };
    }
  }

  return {
    severity: 3,
    explanation: `You reported: "${symptoms}". Our AI service is temporarily offline. Please consult a healthcare professional for an accurate assessment. Monitor your symptoms and seek help if they worsen.`,
    recommendation: 'home',
    possibleConditions: ['Unspecified — please consult a doctor for diagnosis'],
  };
}

// ─── Doctor matcher keyword rules ────────────────────────────────────────────
const SPECIALTY_RULES: Array<{
  keywords: string[];
  specialization: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  alternatives: string[];
}> = [
  {
    keywords: ['chest pain', 'heart attack', 'cardiac', 'palpitation'],
    specialization: 'Cardiologist',
    urgency: 'emergency',
    alternatives: ['General Physician', 'Emergency Medicine'],
  },
  {
    keywords: ['stroke', 'facial drooping', 'sudden weakness'],
    specialization: 'Neurologist',
    urgency: 'emergency',
    alternatives: ['Emergency Medicine'],
  },
  {
    keywords: ['shortness of breath', 'difficulty breathing', 'asthma', 'lung'],
    specialization: 'Pulmonologist',
    urgency: 'urgent',
    alternatives: ['General Physician'],
  },
  {
    keywords: ['skin', 'rash', 'acne', 'eczema', 'dermatitis'],
    specialization: 'Dermatologist',
    urgency: 'routine',
    alternatives: ['General Physician'],
  },
  {
    keywords: ['eye', 'vision', 'blurry', 'cataracts'],
    specialization: 'Ophthalmologist',
    urgency: 'routine',
    alternatives: ['General Physician'],
  },
  {
    keywords: ['ear', 'hearing', 'vertigo', 'dizziness', 'throat'],
    specialization: 'ENT Specialist',
    urgency: 'routine',
    alternatives: ['General Physician'],
  },
  {
    keywords: ['stomach', 'abdomen', 'digestive', 'gastro', 'liver', 'gut'],
    specialization: 'Gastroenterologist',
    urgency: 'routine',
    alternatives: ['General Physician'],
  },
  {
    keywords: ['bone', 'joint', 'arthritis', 'fracture', 'orthopedic', 'knee'],
    specialization: 'Orthopedist',
    urgency: 'routine',
    alternatives: ['General Physician', 'Rheumatologist'],
  },
  {
    keywords: ['anxiety', 'depression', 'mental', 'psychiatric', 'stress'],
    specialization: 'Psychiatrist',
    urgency: 'routine',
    alternatives: ['Psychologist', 'General Physician'],
  },
  {
    keywords: ['child', 'pediatric', 'infant', 'baby', 'toddler'],
    specialization: 'Pediatrician',
    urgency: 'routine',
    alternatives: ['General Physician'],
  },
  {
    keywords: ['diabetes', 'thyroid', 'hormone', 'endocrine'],
    specialization: 'Endocrinologist',
    urgency: 'routine',
    alternatives: ['General Physician'],
  },
  {
    keywords: ['kidney', 'urine', 'renal', 'urinary'],
    specialization: 'Nephrologist',
    urgency: 'routine',
    alternatives: ['Urologist', 'General Physician'],
  },
  {
    keywords: ['gynecology', 'menstrual', 'pregnancy', 'uterus', 'ovary'],
    specialization: 'Gynecologist',
    urgency: 'routine',
    alternatives: ['General Physician'],
  },
];

export function offlineDoctorMatch(input: string): DoctorMatchResult {
  const lower = input.toLowerCase();

  for (const rule of SPECIALTY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return {
        specialization: rule.specialization,
        urgency: rule.urgency,
        reason: `Based on the reported condition (${input}), a ${rule.specialization} is recommended. This is an offline recommendation — please verify with a healthcare provider.`,
        alternativeSpecializations: rule.alternatives,
      };
    }
  }

  return {
    specialization: 'General Physician',
    urgency: 'routine',
    reason: `For the reported condition (${input}), start with a General Physician who can refer you to a specialist if needed. This is an offline recommendation.`,
    alternativeSpecializations: ['Family Medicine', 'Internal Medicine'],
  };
}

// ─── Follow-up questions ─────────────────────────────────────────────────────
export function offlineFollowUpQuestions(symptoms: string): string[] {
  const lower = symptoms.toLowerCase();
  const questions: string[] = ['How long have you been experiencing these symptoms?'];

  if (lower.includes('fever') || lower.includes('temperature')) {
    questions.push('Have you measured your temperature? If so, what was it?');
    questions.push('Have you had any chills or night sweats along with the fever?');
  } else if (lower.includes('pain')) {
    questions.push('How would you describe the pain — sharp, dull, or throbbing?');
    questions.push('Does the pain spread to any other part of your body?');
  } else if (lower.includes('cough')) {
    questions.push('Is the cough dry, or are you bringing up phlegm?');
    questions.push('Have you had any difficulty breathing alongside the cough?');
  } else {
    questions.push('Have you experienced these symptoms before?');
    questions.push('Are there any other symptoms you have noticed recently?');
  }

  questions.push('Have you taken any medications or home remedies for this?');
  questions.push('Do you have any known allergies or pre-existing medical conditions?');

  return questions.slice(0, 5);
}

// ─── Report simplifier ───────────────────────────────────────────────────────
export function offlineReportSimplify(): ReportSimplificationResult {
  return {
    summary:
      'Our AI service is temporarily offline and could not process your report right now. Please bring this report to your doctor who can explain the results in full detail.',
    keyFindings: [
      'Report analysis is currently unavailable offline.',
      'Please share this report with your healthcare provider for a proper explanation.',
    ],
    actionItems: [
      'Schedule an appointment with your doctor to review this report.',
      'Do not change any medications or treatments without medical advice.',
      'Keep a safe copy of this report for your medical records.',
    ],
    glossary: {
      'Reference Range':
        'The normal expected values for a lab test in a healthy individual.',
      'Lab Values':
        'Measured quantities from blood, urine, or other samples used to assess health status.',
    },
  };
}

// ─── Prescription summary ────────────────────────────────────────────────────
export function offlinePrescriptionSummary(): {
  raw: Record<string, unknown>;
  formatted: string;
} {
  return {
    raw: {
      overview:
        "Prescription analysis is temporarily unavailable. Please follow your doctor's original instructions carefully.",
      medicines: [],
      generalNotes:
        'Consult your prescribing doctor or a pharmacist for a full explanation of this prescription.',
      urgentWarnings: '',
    },
    formatted:
      "**Overview:** Prescription analysis is temporarily unavailable. Our AI service is offline.\n\n**Action Required:** Please follow your doctor's original written instructions and consult your pharmacist if you have any questions about your medicines.",
  };
}

// ─── Diet plan ───────────────────────────────────────────────────────────────
export function offlineDietPlan(input: DietPlanInput): DietPlanResult {
  const heightM = input.height / 100;
  const bmi = parseFloat((input.weight / (heightM * heightM)).toFixed(1));

  const bmr =
    input.gender?.toLowerCase() === 'female'
      ? 10 * input.weight + 6.25 * input.height - 5 * input.age - 161
      : 10 * input.weight + 6.25 * input.height - 5 * input.age + 5;
  const dailyCalories = Math.round(bmr * 1.55);

  const plan = `DAILY CALORIE REQUIREMENT: ${dailyCalories} kcal

---DIET BASIS---
This is a general offline diet plan. Our AI service is temporarily unavailable. The meals below represent a balanced standard recommendation.

---BREAKFAST---
• Oatmeal or whole grain cereal (1 cup)
• Fresh fruit — banana, apple, or orange (1 medium)
• Low-fat milk or plant-based milk (1 glass)
• Boiled egg or a small handful of mixed nuts

---MID-MORNING SNACK---
• A handful of nuts or seeds
• Fresh fruit or vegetable sticks with hummus

---LUNCH---
• Whole grain rice or 2 chapatis
• Dal or lentil soup (1 cup)
• Mixed vegetable curry (1 cup)
• Fresh salad — cucumber, tomato, onion
• Low-fat yogurt (1 cup)

---EVENING SNACK---
• Green tea with a light snack (nuts, seeds, or fruit)

---DINNER---
• Whole grain bread or 2 chapatis
• Dal or legume-based dish (1 cup)
• Steamed or stir-fried vegetables (1 cup)
• Light soup as a starter

---NOTES---
• Hydration: Drink 8–10 glasses of water daily.
• Allergen reminder: Avoid any foods you are allergic to.
• Health tip: Maintain consistent meal timings and avoid late-night eating.
• General: 30 minutes of light exercise daily complements a healthy diet.

Note: This is an offline general plan. Regenerate once AI service is restored for a fully personalised plan.`;

  return { bmi, dailyCalories, plan };
}
