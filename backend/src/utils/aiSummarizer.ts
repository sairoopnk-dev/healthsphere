import { getAIResponse, AIAllProvidersFailedError } from './aiHandler';
import { offlinePrescriptionSummary, offlineReportSimplify } from './offlineFallback';

/* ─────────────────────────────────────────────────────────────────────────────
   PRESCRIPTION SUMMARIZER
   Input  : free-form prescription text written by a doctor
   Output : structured, patient-friendly bullet breakdown by medicine type
───────────────────────────────────────────────────────────────────────────── */
const PRESCRIPTION_PROMPT = (content: string) => `
You are a friendly medical assistant helping patients understand their prescriptions.
A doctor has written the following prescription for a patient:

"${content}"

Please analyze this prescription and respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:

{
  "overview": "<1-2 sentence plain English overview of what this prescription is for>",
  "medicines": [
    {
      "name": "<medicine name>",
      "type": "<Tablet | Syrup | Ointment | Injection | IV Fluid | Drops | Capsule | Other>",
      "dosage": "<dosage amount e.g. 500mg, 5ml>",
      "frequency": "<how often to take it in plain English e.g. Twice daily, Once at night>",
      "duration": "<how long e.g. 5 days, 2 weeks — write Unknown if not mentioned>",
      "instructions": "<important instructions e.g. Take after food, Apply to affected area — write None if not specified>"
    }
  ],
  "generalNotes": "<any important general advice from the prescription, or empty string if none>",
  "urgentWarnings": "<any drug interactions or urgent warnings if applicable, or empty string>"
}

Rules:
- Keep all language simple and patient-friendly. Avoid heavy medical jargon.
- Be thorough — identify every medicine mentioned.
- BD = twice daily, TDS = three times daily, OD = once daily, HS = at night/bedtime, SOS = as needed.
- If dosage or frequency is unclear, do your best to infer it.
`;

/* ─────────────────────────────────────────────────────────────────────────────
   MEDICAL REPORT SUMMARIZER
   Input  : raw medical report text (lab values, findings, diagnostics, etc.)
   Output : patient-friendly breakdown of key findings and what they mean
───────────────────────────────────────────────────────────────────────────── */
const REPORT_PROMPT = (content: string, reportType: string) => `
You are a friendly medical assistant helping a patient understand their ${reportType} report.
Here is the medical report:

"${content}"

Please analyze this report and respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:

{
  "overview": "<2-3 sentence plain English summary of what this report shows overall>",
  "keyFindings": [
    {
      "parameter": "<test name or finding e.g. HbA1c, Blood Pressure, Hemoglobin>",
      "yourValue": "<the patient's actual value>",
      "normalRange": "<normal reference range if available, else Unknown>",
      "status": "<Normal | High | Low | Critical | Borderline>",
      "explanation": "<1-2 sentence plain English explanation of what this means for the patient>"
    }
  ],
  "concerns": "<any values that are significantly abnormal and need attention, in plain language — empty string if all normal>",
  "recommendation": "<simple follow-up advice e.g. Consult doctor about sugar levels — empty string if not needed>"
}

Rules:
- Use simple patient-friendly language. No complex medical jargon.
- Focus on what the patient needs to understand and act on.
- If a value is normal, reassure the patient.
- If a value is abnormal, explain the significance clearly but calmly.
`;

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT: generateAiSummary
───────────────────────────────────────────────────────────────────────────── */
export interface AISummaryResult {
  type: 'prescription' | 'report';
  raw: any;           // parsed JSON from AI
  formatted: string;  // human-readable markdown-style string stored in DB
}

export async function generateAiSummary(
  content: string,
  recordType: string,
  title: string,
  patientHistory?: string,
): Promise<AISummaryResult> {
  const isPrescription = recordType === 'prescription';

  const historyBlock = patientHistory
    ? `\n\nPatient Medical History (from memory):\n${patientHistory}\n\nUse this history to provide more relevant context in your summary. Reference any known conditions or past treatments.\n`
    : '';

  const prompt = isPrescription
    ? PRESCRIPTION_PROMPT(content) + historyBlock
    : REPORT_PROMPT(content, title) + historyBlock;

  try {
    const text = await getAIResponse(prompt);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    let formatted = '';

    if (isPrescription) {
      formatted += `**Overview:** ${parsed.overview}\n\n`;
      formatted += `**Medicines Prescribed:**\n`;
      for (const med of parsed.medicines || []) {
        formatted += `\n• **${med.name}** (${med.type})\n`;
        formatted += `  - Dosage: ${med.dosage}\n`;
        formatted += `  - Frequency: ${med.frequency}\n`;
        formatted += `  - Duration: ${med.duration}\n`;
        formatted += `  - Instructions: ${med.instructions}\n`;
      }
      if (parsed.generalNotes) {
        formatted += `\n**General Notes:** ${parsed.generalNotes}\n`;
      }
      if (parsed.urgentWarnings) {
        formatted += `\n⚠️ **Warnings:** ${parsed.urgentWarnings}\n`;
      }
    } else {
      formatted += `**Overview:** ${parsed.overview}\n\n`;
      formatted += `**Key Findings:**\n`;
      for (const finding of parsed.keyFindings || []) {
        const statusEmoji =
          finding.status === 'Normal' ? '✅' :
          finding.status === 'Critical' ? '🚨' :
          finding.status === 'High' || finding.status === 'Low' ? '⚠️' : '📊';
        formatted += `\n${statusEmoji} **${finding.parameter}**\n`;
        formatted += `  - Your value: ${finding.yourValue}\n`;
        formatted += `  - Normal range: ${finding.normalRange}\n`;
        formatted += `  - Status: **${finding.status}**\n`;
        formatted += `  - ${finding.explanation}\n`;
      }
      if (parsed.concerns) {
        formatted += `\n⚠️ **Areas of Concern:** ${parsed.concerns}\n`;
      }
      if (parsed.recommendation) {
        formatted += `\n💡 **Recommendation:** ${parsed.recommendation}\n`;
      }
    }

    return {
      type: isPrescription ? 'prescription' : 'report',
      raw: parsed,
      formatted: formatted.trim(),
    };
  } catch (err) {
    if (err instanceof AIAllProvidersFailedError) {
      console.warn('[AI] Offline fallback active for AI summarizer');

      if (isPrescription) {
        const fallback = offlinePrescriptionSummary();
        return {
          type: 'prescription',
          raw: fallback.raw,
          formatted: fallback.formatted,
        };
      } else {
        const fallback = offlineReportSimplify();
        const formatted =
          `**Overview:** ${fallback.summary}\n\n` +
          `**Key Findings:**\n` +
          fallback.keyFindings.map((f) => `\n📊 ${f}`).join('') +
          `\n\n💡 **Recommendation:** ${fallback.actionItems[0] ?? ''}`;
        return {
          type: 'report',
          raw: fallback,
          formatted: formatted.trim(),
        };
      }
    }
    throw err;
  }
}
