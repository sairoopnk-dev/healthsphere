import { getAIResponse, AIAllProvidersFailedError } from './aiHandler';
import { offlineReportSimplify } from './offlineFallback';

export interface ReportSimplificationResult {
  summary: string;
  keyFindings: string[];
  actionItems: string[];
  glossary: Record<string, string>;
}

export async function simplifyReportAI(reportText: string): Promise<ReportSimplificationResult> {
  const prompt = `You are a medical report simplifier AI. Translate the following medical report into plain, easy-to-understand language for a patient with no medical background.

Medical Report:
"${reportText}"

Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "summary": "<2-3 sentence plain-English summary of the overall report>",
  "keyFindings": ["<finding 1 in simple terms>", "<finding 2>"],
  "actionItems": ["<what the patient should do next, step 1>", "<step 2>"],
  "glossary": {
    "<medical term>": "<simple definition>",
    "<another term>": "<definition>"
  }
}

Rules:
- Use simple language a 12-year-old can understand
- Avoid medical jargon in summary and findings; define any unavoidable terms in glossary
- actionItems should be practical and clear
- Include at least 2 entries in glossary for any medical terms found`;

  try {
    const text = await getAIResponse(prompt);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed: ReportSimplificationResult = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    if (err instanceof AIAllProvidersFailedError) {
      console.warn('[AI] Offline fallback active for report simplifier');
      return offlineReportSimplify();
    }
    throw err;
  }
}
