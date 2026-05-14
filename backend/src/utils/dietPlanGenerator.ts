import { getAIResponse, AIAllProvidersFailedError } from './aiHandler';
import { offlineDietPlan } from './offlineFallback';

export interface DietPlanInput {
  height: number;     // cm
  weight: number;     // kg
  gender: string;
  age:    number;
  dietType: 'vegan' | 'vegetarian' | 'non-vegetarian';
  allergies: string;
  goal: string;
  useSymptoms?: boolean;
  recentSymptoms?: string[];
}

export interface DietPlanResult {
  bmi: number;
  dailyCalories: number;
  plan: string;
}

export async function generateDietPlanAI(
  input: DietPlanInput,
  patientHistory?: string,
): Promise<DietPlanResult> {
  const { height, weight, gender, age, dietType, allergies, goal, useSymptoms, recentSymptoms } = input;

  // ── BMI ───────────────────────────────────────────────────────────────────
  const heightM = height / 100;
  const bmi     = parseFloat((weight / (heightM * heightM)).toFixed(1));

  // ── Mifflin-St Jeor BMR then TDEE at moderate activity ───────────────────
  let bmr: number;
  if (gender?.toLowerCase() === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }
  let tdee = Math.round(bmr * 1.55); // moderate activity

  // Adjust for goal
  let goalAdj = '';
  if (goal === 'weight-loss')  { tdee = Math.round(tdee * 0.85); goalAdj = 'The patient wants to lose weight — the plan should be in a slight caloric deficit.'; }
  if (goal === 'weight-gain')  { tdee = Math.round(tdee * 1.10); goalAdj = 'The patient wants to gain healthy weight — the plan should be in a slight caloric surplus.'; }
  if (!goal || goal === 'maintenance') goalAdj = 'The patient wants to maintain current weight.';

  const dailyCalories = tdee;

  const bmiCategory =
    bmi < 18.5 ? 'Underweight' :
    bmi < 25   ? 'Normal weight' :
    bmi < 30   ? 'Overweight' : 'Obese';

  const allergyNote = allergies?.trim()
    ? `The patient is allergic to or wants to avoid: ${allergies}. Do NOT include any of these foods.`
    : 'No specific allergies reported.';

  const historySection = patientHistory
    ? `\n\nPATIENT MEDICAL HISTORY (from memory):\n${patientHistory}\n\nConsider the patient's medical history when designing the diet plan. If they have conditions like diabetes, hypertension, or deficiencies, adjust recommendations accordingly.\n`
    : '';

  // ── Symptom-based context ──────────────────────────────────────────────────
  let symptomSection = '';
  let planBasisLine = '';

  if (useSymptoms && recentSymptoms && recentSymptoms.length > 0) {
    const symptomList = recentSymptoms.join(', ');
    symptomSection = `
RECENT SYMPTOMS REPORTED BY PATIENT:
${recentSymptoms.map(s => `- ${s}`).join('\n')}

CRITICAL INSTRUCTIONS FOR SYMPTOM-BASED DIET:
- This diet plan must be specifically tailored to address the above symptoms.
- Mention the symptoms in your notes and explain how the diet addresses them.
- Avoid foods that can trigger or worsen these symptoms.
- Recommend foods known to help with these specific conditions.
- For digestive symptoms (acidity, bloating, indigestion): focus on bland, easy-to-digest, low-spice foods.
- For headache/migraine: avoid known triggers like caffeine excess, aged cheese, processed foods.
- For fatigue/weakness: include iron-rich and energy-boosting foods.
- For stress/anxiety: include foods rich in magnesium, omega-3, and B-vitamins.
`;
    planBasisLine = `DIET PLAN BASIS: This diet plan is based on the patient's recent symptoms: ${symptomList}. Mention this clearly at the top of the plan.`;
  } else {
    planBasisLine = `DIET PLAN BASIS: This is a general balanced diet plan based on the patient's profile (height, weight, age, gender). Mention this clearly at the top of the plan.`;
  }

  const prompt = `
You are a certified clinical nutritionist AI. Generate a detailed, personalized daily diet plan for a patient.
${historySection}
${symptomSection}
${planBasisLine}

PATIENT PROFILE:
- Height: ${height} cm
- Weight: ${weight} kg
- Gender: ${gender}
- Age: ${age} years
- BMI: ${bmi} (${bmiCategory})
- Estimated Daily Calorie Requirement: ${dailyCalories} kcal
- Diet Preference: ${dietType}
- Goal: ${goal || 'Maintenance'}
- ${goalAdj}
- Allergies/Restrictions: ${allergyNote}

Generate the diet plan strictly in the following text format (use this template exactly, do not use JSON):

DAILY CALORIE REQUIREMENT: ${dailyCalories} kcal

---DIET BASIS---
${useSymptoms && recentSymptoms && recentSymptoms.length > 0
    ? `This diet plan is tailored based on your recent symptoms: ${recentSymptoms.join(', ')}. The meals are designed to help manage these symptoms while meeting your nutritional needs.`
    : 'This is a balanced diet plan based on your profile (height, weight, age, and gender) to help you meet your nutritional goals.'
  }

---BREAKFAST---
(List 3-4 breakfast items with portion sizes)

---MID-MORNING SNACK---
(List 1-2 healthy snacks)

---LUNCH---
(List 4-5 lunch items with portion sizes)

---EVENING SNACK---
(List 1-2 snacks)

---DINNER---
(List 4-5 dinner items with portion sizes)

---NOTES---
• Hydration: (water intake advice)
${useSymptoms && recentSymptoms && recentSymptoms.length > 0
    ? `• Symptom Management: (explain how this diet helps with the reported symptoms: ${recentSymptoms.join(', ')})\n• Foods to Avoid: (list specific foods to avoid considering the symptoms)`
    : '• Allergen reminder: (remind about allergens to avoid)'
  }
• Health tip: (one personalized health tip based on BMI/goal)
• General: (one general wellness advice)

RULES:
- Only suggest ${dietType} foods. Never include meat/fish for vegan/vegetarian.
- Avoid all allergens listed above.
- Keep portions realistic and practical.
- Use simple, everyday Indian or globally common ingredients.
- Keep language simple and friendly.
- Each meal should balance macronutrients appropriately.
${useSymptoms && recentSymptoms && recentSymptoms.length > 0
    ? '- ALWAYS mention the symptoms this diet addresses in the DIET BASIS and NOTES sections.'
    : ''
  }
`.trim();

  try {
    const text = await getAIResponse(prompt);
    const plan = text.trim();
    console.log('[AI] Diet plan generated successfully');
    return { bmi, dailyCalories, plan };
  } catch (err) {
    if (err instanceof AIAllProvidersFailedError) {
      console.warn('[AI] Offline fallback active for diet plan generator');
      return offlineDietPlan(input);
    }
    throw err;
  }
}
