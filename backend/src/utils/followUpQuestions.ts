import { getAIResponse, AIAllProvidersFailedError } from './aiHandler';
import { offlineFollowUpQuestions } from './offlineFallback';

/**
 * Generates exactly 5 short, relevant follow-up questions for the given symptoms.
 * Falls back to keyword-based offline questions if all AI providers fail.
 */
export async function generateFollowUpQuestionsAI(symptoms: string): Promise<string[]> {
  const prompt = `You are a medical AI assistant. A patient has reported the following symptoms: "${symptoms}"

Based on the given symptoms, generate EXACTLY 5 short and relevant follow-up questions. Do NOT generate more than 5 questions.

Rules:
- Questions must be directly related to the reported symptoms
- Keep each question SHORT (one sentence, max 15 words)
- Do NOT ask for name, email, or any personal identifiable information
- Do NOT ask the patient to rate their pain on any scale (e.g., 1-10).
- All questions must be optional for the patient to answer
- Cover aspects like: duration, other concurrent symptoms, medication taken, relevant history
- Respond ONLY with a valid JSON array of strings, no markdown, no extra text

Example format:
["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

  try {
    const text = await getAIResponse(prompt);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed: string[] = JSON.parse(cleaned);
    return parsed.slice(0, 5);
  } catch (err) {
    if (err instanceof AIAllProvidersFailedError) {
      console.warn('[AI] Offline fallback active for follow-up questions');
      return offlineFollowUpQuestions(symptoms);
    }
    throw err;
  }
}
