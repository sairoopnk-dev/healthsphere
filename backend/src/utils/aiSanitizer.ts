/**
 * aiSanitizer.ts
 *
 * Strips all PII before any data leaves the backend toward an AI service.
 * Fields NEVER forwarded: name, email, phone, address, userId.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AISanitizedPayload {
  symptoms: string;
  past_conditions: string | null;
  severity_context: string | null;
}

export interface AIRawInput {
  symptoms?: unknown;
  past_conditions?: unknown;
  severity_context?: unknown;
  // Any extra keys from req.body are intentionally ignored
  [key: string]: unknown;
}

// ── Allowed keys whitelist (strict) ──────────────────────────────────────────

const ALLOWED_KEYS: Array<keyof AISanitizedPayload> = [
  'symptoms',
  'past_conditions',
  'severity_context',
];

// ── Sanitizer ─────────────────────────────────────────────────────────────────

/**
 * Builds a clean, PII-free payload for Gemini / any AI service.
 *
 * - Whitelists only `symptoms`, `past_conditions`, `severity_context`.
 * - Throws a typed error if `symptoms` is missing or empty so callers can
 *   return a 400 before the AI call is ever made.
 * - Coerces optional fields to `null` when absent so the shape is always
 *   predictable downstream.
 */
export function sanitizeForAI(input: AIRawInput): AISanitizedPayload {
  // ── Required field validation ──
  if (!input.symptoms || typeof input.symptoms !== 'string' || input.symptoms.trim() === '') {
    const err = new Error('sanitizeForAI: "symptoms" is required and must be a non-empty string');
    (err as any).statusCode = 400;
    throw err;
  }

  const sanitized: AISanitizedPayload = {
    symptoms:         input.symptoms.trim(),
    past_conditions:  typeof input.past_conditions  === 'string' ? input.past_conditions.trim()  || null : null,
    severity_context: typeof input.severity_context === 'string' ? input.severity_context.trim() || null : null,
  };

  // ── Safe audit log — no PII ever reaches this line ───────────────────────
  console.log('[AI Sanitizer] Payload forwarded to AI:', sanitized);

  // ── Strict key check: ensure no extra keys sneak in ─────────────────────
  const outKeys = Object.keys(sanitized) as Array<keyof AISanitizedPayload>;
  for (const k of outKeys) {
    if (!ALLOWED_KEYS.includes(k)) {
      delete sanitized[k as keyof AISanitizedPayload];
    }
  }

  return sanitized;
}
