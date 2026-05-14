/**
 * Memory Service — HealthSphere
 *
 * High-level helpers that wrap hindsightClient for each interaction type.
 * Every function is fire-and-forget safe (never throws to the caller).
 */

import {
  storeMemory,
  getMemory,
  formatMemoriesForPrompt,
  type RecalledMemory,
} from './hindsightClient';

/* ═══════════════════════════════════════════════════════════════════════════
   STORE helpers  —  call after an interaction completes
═══════════════════════════════════════════════════════════════════════════ */

/** Store both the patient's raw symptoms AND the AI response */
export async function storeSymptomCheck(
  userId: string,
  symptoms: string,
  aiResult: { severity: number; explanation: string; recommendation: string; possibleConditions?: string[] },
): Promise<void> {
  const ts = new Date().toISOString();

  // 1. User's symptom input
  await storeMemory({
    userId,
    type: 'symptom',
    content: `Patient reported symptoms: "${symptoms}"`,
    timestamp: ts,
  });

  // 2. AI response
  const conditions = aiResult.possibleConditions?.join(', ') || 'none identified';
  await storeMemory({
    userId,
    type: 'ai_response',
    content: [
      `Symptom analysis result for: "${symptoms}"`,
      `Severity: ${aiResult.severity}/10 (${aiResult.recommendation === 'consult' ? 'Doctor visit recommended' : 'Home care'})`,
      `Explanation: ${aiResult.explanation}`,
      `Possible conditions: ${conditions}`,
    ].join('\n'),
    timestamp: ts,
  });
}

/** Store a medical report / prescription that was created or summarised */
export async function storeMedicalReport(
  userId: string,
  title: string,
  description: string,
  aiSummary?: string,
): Promise<void> {
  const content = [
    `Medical record: "${title}"`,
    `Details: ${description}`,
    aiSummary ? `AI Summary: ${aiSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  await storeMemory({ userId, type: 'report', content });
}

/** Store an appointment completion (diagnosis + notes) */
export async function storeAppointment(
  userId: string,
  doctorName: string,
  diagnosis: string,
  notes?: string,
): Promise<void> {
  const content = [
    `Appointment completed with ${doctorName}`,
    diagnosis ? `Diagnosis: ${diagnosis}` : '',
    notes ? `Notes: ${notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  await storeMemory({ userId, type: 'appointment', content });
}

/** Store a generated diet plan */
export async function storeDietPlan(
  userId: string,
  preferences: { dietType: string; allergies?: string; goal?: string },
  planSnippet: string,
): Promise<void> {
  const content = [
    `Diet plan generated — ${preferences.dietType}, goal: ${preferences.goal || 'maintenance'}`,
    preferences.allergies ? `Allergies: ${preferences.allergies}` : '',
    `Plan preview: ${planSnippet.slice(0, 500)}`,
  ]
    .filter(Boolean)
    .join('\n');

  await storeMemory({ userId, type: 'diet_plan', content });
}

/* ═══════════════════════════════════════════════════════════════════════════
   RECALL helpers  —  call before generating an AI response
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch the patient's relevant history and return a formatted string
 * ready for injection into a Gemini prompt.
 *
 * Returns empty string when there is no history (first-time user) or on error.
 */
export async function getPatientHistory(
  userId: string,
  currentQuery: string,
): Promise<string> {
  if (!userId) return '';

  try {
    const memories = await getMemory(userId, currentQuery, 15);
    return formatMemoriesForPrompt(memories);
  } catch {
    return '';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   INSIGHTS  —  dedicated recall for the frontend panel
═══════════════════════════════════════════════════════════════════════════ */

export interface MemoryInsights {
  recurringSymptoms: string[];
  pastConditions: string[];
  patternsDetected: string[];
  recentHistory: string[];
}

/**
 * Build a structured insights object for the frontend "Memory Insights" panel.
 * Uses two targeted recalls to gather symptom-related and condition-related memories.
 */
export async function getMemoryInsights(
  userId: string,
): Promise<MemoryInsights> {
  const empty: MemoryInsights = {
    recurringSymptoms: [],
    pastConditions: [],
    patternsDetected: [],
    recentHistory: [],
  };

  if (!userId) return empty;

  try {
    // Two semantic queries to get different slices of history
    const [symptomMems, conditionMems] = await Promise.all([
      getMemory(userId, 'symptoms reported by patient recurring health issues', 20),
      getMemory(userId, 'diagnosis conditions appointments reports', 20),
    ]);

    // Extract symptom mentions
    const symptomSet = new Set<string>();
    const conditionSet = new Set<string>();
    const recentHistory: string[] = [];

    for (const m of symptomMems) {
      const c = m.text || '';

      // Look for symptom lines
      const symMatch = c.match(/symptoms?:\s*"([^"]+)"/i);
      if (symMatch) symptomSet.add(symMatch[1]);

      // Collect as recent history (trim for display)
      if (c.length > 10) {
        recentHistory.push(c.split('\n')[0].replace(/^\[\w+\]\s*\([^)]*\)\s*/, '').trim());
      }
    }

    for (const m of conditionMems) {
      const c = m.text || '';

      // Look for conditions
      const condMatch = c.match(/(?:possible conditions?|diagnosis):\s*(.+)/i);
      if (condMatch) {
        condMatch[1].split(/,|;/).forEach(cond => {
          const trimmed = cond.trim();
          if (trimmed && trimmed !== 'none identified') conditionSet.add(trimmed);
        });
      }
    }

    // Simple pattern detection: symptoms appearing more than once
    const symptomArr = Array.from(symptomSet);
    const patterns: string[] = [];

    if (symptomArr.length >= 3) {
      patterns.push(`${symptomArr.length} different symptom checks recorded — consider a general health review`);
    }

    // Check for headache-like recurring keywords
    const allContent = [...symptomMems, ...conditionMems]
      .map(m => (m.text || '').toLowerCase())
      .join(' ');

    const frequentKeywords = ['headache', 'fever', 'fatigue', 'pain', 'cough', 'nausea'];
    for (const kw of frequentKeywords) {
      const count = (allContent.match(new RegExp(kw, 'g')) || []).length;
      if (count >= 2) {
        patterns.push(`Frequent ${kw} reports (mentioned ${count} times)`);
      }
    }

    return {
      recurringSymptoms: symptomArr.slice(0, 10),
      pastConditions: Array.from(conditionSet).slice(0, 10),
      patternsDetected: patterns.slice(0, 5),
      recentHistory: recentHistory.slice(0, 8),
    };
  } catch (err) {
    console.error('[MemoryService] getMemoryInsights error:', err);
    return empty;
  }
}
