/**
 * Hindsight Memory Client — HealthSphere
 *
 * Reusable, healthcare-aware wrapper around the Hindsight REST API.
 * Uses native fetch (no SDK).  Every public function is safe to call even
 * when the Hindsight service is unreachable — errors are logged and swallowed
 * so that AI features degrade gracefully.
 */

const HINDSIGHT_API_KEY = process.env.HINDSIGHT_API_KEY || '';
const BASE_URL =
  process.env.HINDSIGHT_API_URL || 'https://api.hindsight.vectorize.io/v1';

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */

export type MemoryType =
  | 'symptom'
  | 'ai_response'
  | 'report'
  | 'appointment'
  | 'diet_plan';

export interface MemoryEntry {
  userId: string;
  type: MemoryType;
  content: string;
  timestamp?: string;          // ISO string — defaults to now
  metadata?: Record<string, any>;
}

export interface RecalledMemory {
  id?: string;
  text: string;          // extracted fact from Hindsight
  type?: string;         // world | experience | observation
  context?: string;
  entities?: string[];
  mentioned_at?: string;
  [key: string]: any;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

/** Per-patient memory bank id */
function bankId(userId: string): string {
  return `healthsphere-${userId}`;
}

/** Headers shared by every Hindsight request */
function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${HINDSIGHT_API_KEY}`,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   storeMemory
   Persists a structured MemoryEntry into the patient's Hindsight bank.
───────────────────────────────────────────────────────────────────────────── */

export async function storeMemory(entry: MemoryEntry): Promise<any | null> {
  if (!HINDSIGHT_API_KEY) {
    console.warn('[Hindsight] API key not set — skipping storeMemory');
    return null;
  }

  const ts = entry.timestamp || new Date().toISOString();

  // Build a natural-language string so Hindsight can index semantically
  const structuredContent = [
    `[${entry.type.toUpperCase()}] (${ts})`,
    `Patient: ${entry.userId}`,
    entry.content,
  ].join('\n');

  try {
    const res = await fetch(
      `${BASE_URL}/default/banks/${bankId(entry.userId)}/memories`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          items: [
            {
              content: structuredContent,
              context: `HealthSphere ${entry.type} entry for patient ${entry.userId}`,
              document_id: `${entry.userId}-${entry.type}-${ts}`,
            },
          ],
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Hindsight] storeMemory ${res.status}: ${errText}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('[Hindsight] storeMemory network error:', err);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   getMemory
   Recalls semantically relevant memories for a patient given a query.
   Returns at most `limit` entries (default 15).
───────────────────────────────────────────────────────────────────────────── */

export async function getMemory(
  userId: string,
  query: string,
  limit = 15,
): Promise<RecalledMemory[]> {
  if (!HINDSIGHT_API_KEY) {
    console.warn('[Hindsight] API key not set — skipping getMemory');
    return [];
  }

  try {
    const res = await fetch(
      `${BASE_URL}/default/banks/${bankId(userId)}/memories/recall`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ query }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Hindsight] getMemory ${res.status}: ${errText}`);
      return [];
    }

    const data = await res.json();

    // Hindsight recall returns { results: [...] }
    const raw = data.results ?? data.memories ?? data.data ?? [];
    const memories: RecalledMemory[] = Array.isArray(raw) ? raw : [];

    return memories.slice(0, limit);
  } catch (err) {
    console.error('[Hindsight] getMemory network error:', err);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   formatMemoriesForPrompt
   Converts raw recalled memories into a clean text block that can be
   injected into any Gemini prompt.
───────────────────────────────────────────────────────────────────────────── */

export function formatMemoriesForPrompt(memories: RecalledMemory[]): string {
  if (!memories.length) return '';

  const lines = memories.map((m, i) => {
    // Hindsight returns extracted facts in the `text` field
    const fact = m.text || (typeof m.content === 'string' ? m.content : '') || JSON.stringify(m);
    return `${i + 1}. ${fact}`;
  });

  return [
    '── Patient Medical History (from memory) ──',
    ...lines,
    '── End of History ──',
  ].join('\n');
}
