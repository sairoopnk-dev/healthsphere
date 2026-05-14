import { getAIResponse, AIAllProvidersFailedError } from './aiHandler';
import { offlineSymptomCheck } from './offlineFallback';

export interface SymptomCheckResult {
  severity: number;
  explanation: string;
  recommendation: 'home' | 'consult';
  possibleConditions: string[];
}

export async function checkSymptomsAI(
  symptoms: string,
  patientHistory?: string,
  answers?: { question: string; answer: string }[],
): Promise<SymptomCheckResult> {
  const historyBlock = patientHistory
    ? `\n\n${patientHistory}\n\nConsider the patient's medical history when analyzing current symptoms.\nIf you detect a pattern of worsening or recurring symptoms, flag this in your explanation.\n`
    : '';

  const answersBlock =
    answers && answers.length > 0
      ? `\n\nThe patient also answered these follow-up questions:\n${answers
          .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer || '(skipped)'}`)
          .join('\n')}\n\nUse these answers to improve accuracy of your analysis.\n`
      : '';

  const prompt = `You are a medical AI assistant. A patient reports the following symptoms: "${symptoms}"${historyBlock}${answersBlock}

Analyze these symptoms and respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "severity": <number from 1 to 10>,
  "explanation": "<brief explanation of the symptoms and their implications>",
  "recommendation": "<'home' if manageable at home, or 'consult' if a doctor visit is needed>",
  "possibleConditions": ["<condition1>", "<condition2>"]
}

Rules:
- severity 1-3: mild, home care sufficient
- severity 4-6: moderate, monitor closely
- severity 7-10: severe, consult a doctor immediately
- recommendation must be exactly 'home' or 'consult'
- If patient history is provided, reference relevant past events in your explanation
- If follow-up answers are provided, factor them into severity and explanation`;

  try {
    const text = await getAIResponse(prompt);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed: SymptomCheckResult = JSON.parse(cleaned);

    parsed.severity = Math.min(10, Math.max(1, Math.round(parsed.severity)));
    if (parsed.recommendation !== 'home' && parsed.recommendation !== 'consult') {
      parsed.recommendation = parsed.severity >= 5 ? 'consult' : 'home';
    }
    return parsed;
  } catch (err) {
    if (err instanceof AIAllProvidersFailedError) {
      console.warn('[AI] Offline fallback active for symptom checker');
      return offlineSymptomCheck(symptoms);
    }
    throw err;
  }
}
