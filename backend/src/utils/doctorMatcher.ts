import { getAIResponse, AIAllProvidersFailedError } from './aiHandler';
import { offlineDoctorMatch } from './offlineFallback';

export interface DoctorMatchResult {
  specialization: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  reason: string;
  alternativeSpecializations: string[];
}

export async function matchDoctorAI(symptomsOrCondition: string): Promise<DoctorMatchResult> {
  const prompt = `You are a medical triage AI. Based on the following patient symptoms or condition: "${symptomsOrCondition}"

Recommend the most appropriate medical specialist and respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "specialization": "<primary doctor specialization, e.g. General Physician, Cardiologist, Dermatologist>",
  "urgency": "<'routine' | 'urgent' | 'emergency'>",
  "reason": "<brief explanation of why this specialist is recommended>",
  "alternativeSpecializations": ["<alt specialty 1>", "<alt specialty 2>"]
}

Rules:
- urgency 'routine': non-urgent, can schedule in days/weeks
- urgency 'urgent': should be seen within 24-48 hours
- urgency 'emergency': go to ER immediately
- specialization should be a real medical specialty`;

  try {
    const text = await getAIResponse(prompt);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed: DoctorMatchResult = JSON.parse(cleaned);

    const validUrgencies = ['routine', 'urgent', 'emergency'];
    if (!validUrgencies.includes(parsed.urgency)) {
      parsed.urgency = 'routine';
    }
    return parsed;
  } catch (err) {
    if (err instanceof AIAllProvidersFailedError) {
      console.warn('[AI] Offline fallback active for doctor matcher');
      return offlineDoctorMatch(symptomsOrCondition);
    }
    throw err;
  }
}
