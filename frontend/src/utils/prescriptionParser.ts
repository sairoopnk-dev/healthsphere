/**
 * Prescription Voice Parser — Single Medicine
 *
 * Receives the transcript for ONE medicine card only.
 * Extracts: name, dosage, frequency, durationDays.
 * No multi-medicine splitting — each card has its own mic instance.
 *
 * Example:
 *   "paracetamol 650 mg twice daily for 5 days"
 *   → { name: "paracetamol", dosage: "650mg", frequency: "Twice daily", durationDays: "5" }
 */

export interface ParsedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  durationDays: string;
}

// ── Frequency Patterns ───────────────────────────────────────────────────────

const FREQUENCY_PATTERNS: [RegExp, string][] = [
  [/\bthrice\s+(?:a\s+)?dai?ly?\b/i, "Three times daily"],
  [/\bthree\s+times?\s+(?:a\s+)?dai?ly?\b/i, "Three times daily"],
  [/\bthree\s+times?\s+(?:a\s+)?day\b/i, "Three times daily"],
  [/\b3\s+times?\s+(?:a\s+)?day\b/i, "Three times daily"],
  [/\btwice\s+(?:a\s+)?dai?ly?\b/i, "Twice daily"],
  [/\btwice\s+(?:a\s+)?day\b/i, "Twice daily"],
  [/\btwo\s+times?\s+(?:a\s+)?day\b/i, "Twice daily"],
  [/\b2\s+times?\s+(?:a\s+)?day\b/i, "Twice daily"],
  [/\bonce\s+(?:a\s+)?dai?ly?\b/i, "Once daily"],
  [/\bonce\s+(?:a\s+)?day\b/i, "Once daily"],
  [/\bone\s+time\s+(?:a\s+)?day\b/i, "Once daily"],
  [/\bevery\s+12\s+hours?\b/i, "Every 12 hours"],
  [/\bevery\s+8\s+hours?\b/i, "Every 8 hours"],
  [/\bbefore\s+breakfast\b/i, "Before breakfast"],
  [/\bafter\s+(?:meals?|food|eating|lunch|dinner|breakfast)\b/i, "After meals"],
  [/\bbefore\s+(?:bed|sleep|sleeping)\b/i, "Before bed"],
  [/\bat\s+(?:bed\s*time|night)\b/i, "Before bed"],
  [/\b(?:as|when)\s+(?:needed|required)\b/i, "As needed"],
  [/\bSOS\b/, "As needed"],
];

// ── Noise words not part of a medicine name ──────────────────────────────────

const NOISE_WORDS = new Set([
  "and", "the", "a", "an", "then", "also", "please", "patient",
  "has", "with", "is", "are", "was", "were", "have", "had",
  "fever", "headache", "cold", "cough", "pain", "suffering",
  "from", "for", "give", "take", "prescribe", "start", "administer",
  "mg", "ml", "medicine", "tablet", "capsule", "syrup", "injection",
  "daily", "once", "twice", "thrice", "days", "day", "week", "weeks",
]);

// ── Dosage ───────────────────────────────────────────────────────────────────

function extractDosage(text: string): string {
  const match = text.match(
    /\b(\d+(?:\.\d+)?)\s*(mg|milligrams?|ml|millilitres?|milliliters?|mcg|micrograms?|g|grams?|iu|units?)\b/i
  );
  if (!match) return "";
  const unitMap: Record<string, string> = {
    milligram: "mg", milligrams: "mg", mg: "mg",
    millilitre: "ml", millilitres: "ml", milliliter: "ml", milliliters: "ml", ml: "ml",
    microgram: "mcg", micrograms: "mcg", mcg: "mcg",
    gram: "g", grams: "g", g: "g",
    iu: "IU", unit: "IU", units: "IU",
  };
  return `${match[1]}${unitMap[match[2].toLowerCase()] || match[2].toLowerCase()}`;
}

// ── Frequency ────────────────────────────────────────────────────────────────

function extractFrequency(text: string): string {
  for (const [pattern, label] of FREQUENCY_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return "";
}

// ── Duration ─────────────────────────────────────────────────────────────────

function extractDuration(text: string): string {
  const dayMatch = text.match(/\b(?:for\s+)?(\d+)\s*days?\b/i);
  if (dayMatch) return dayMatch[1];
  const weekMatch = text.match(/\b(?:for\s+)?(\d+)\s*weeks?\b/i);
  if (weekMatch) return String(parseInt(weekMatch[1]) * 7);
  const monthMatch = text.match(/\b(?:for\s+)?(\d+)\s*months?\b/i);
  if (monthMatch) return String(parseInt(monthMatch[1]) * 30);
  return "";
}

// ── Medicine Name ─────────────────────────────────────────────────────────────

function extractMedicineName(text: string): string {
  let cleaned = text
    .replace(/^.*?(?:prescribe|give|take|start|administer)\s+/i, "")
    .replace(/^(?:medicine|medication|med|drug|tablet|capsule|syrup|injection)\s*/i, "")
    .trim();

  if (!cleaned || cleaned.length < 2) cleaned = text.trim();

  const nameMatch = cleaned.match(
    /^([a-zA-Z][a-zA-Z\s\-]*?)(?=\s+\d|\s+(?:once|twice|thrice|three|two|every|for|daily|before|after|at)\b|$)/i
  );

  if (nameMatch) {
    const words = nameMatch[1]
      .trim()
      .split(/\s+/)
      .filter((w) => !NOISE_WORDS.has(w.toLowerCase()));
    const result = words.join(" ").trim();
    if (result && result.length > 1) return result;
  }

  const words = cleaned.split(/\s+/);
  for (const word of words) {
    if (word.length > 2 && /^[a-zA-Z]/.test(word) && !NOISE_WORDS.has(word.toLowerCase())) {
      return word;
    }
  }
  return "";
}

// ── Main export ───────────────────────────────────────────────────────────────

export function parseSingleMedicine(transcript: string): ParsedMedicine {
  if (!transcript.trim()) {
    return { name: "", dosage: "", frequency: "", durationDays: "" };
  }
  return {
    name: extractMedicineName(transcript),
    dosage: extractDosage(transcript),
    frequency: extractFrequency(transcript),
    durationDays: extractDuration(transcript),
  };
}

// ── Medical condition extractor (for Prescription Title auto-fill) ────────────

const CONDITION_PATTERNS: RegExp[] = [
  /patient\s+(?:is\s+)?(?:has|have|having)\s+([\w\s]+?)(?:\s+and\b|\s+take\b|\s+needs?\b|[.,]|$)/i,
  /diagnosed\s+with\s+([\w\s]+?)(?:\s+and\b|\s+take\b|\s+needs?\b|[.,]|$)/i,
  /suffering\s+from\s+([\w\s]+?)(?:\s+and\b|\s+take\b|\s+needs?\b|[.,]|$)/i,
  /\bhaving\s+([\w\s]+?)(?:\s+and\b|\s+take\b|\s+needs?\b|[.,]|$)/i,
  /complaint(?:s)?\s+of\s+([\w\s]+?)(?:\s+and\b|\s+take\b|\s+needs?\b|[.,]|$)/i,
  /presents?\s+with\s+([\w\s]+?)(?:\s+and\b|\s+take\b|\s+needs?\b|[.,]|$)/i,
];

// Words to strip from extracted conditions (medication verbs, filler, etc.)
const CONDITION_NOISE = new Set([
  "take", "taking", "give", "prescribe", "needs", "need", "use",
  "mg", "ml", "tablet", "tablets", "syrup", "capsule",
]);

function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !CONDITION_NOISE.has(w.toLowerCase()))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Extracts a medical condition from a spoken sentence.
 * Returns title-cased condition string, or null if no pattern matches.
 *
 * Examples:
 *   "patient has high fever and take Dolo 650 mg"  → "High Fever"
 *   "diagnosed with dengue"                         → "Dengue"
 *   "suffering from tooth pain"                     → "Tooth Pain"
 */
export function extractCondition(transcript: string): string | null {
  if (!transcript.trim()) return null;

  for (const pattern of CONDITION_PATTERNS) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const condition = toTitleCase(match[1]);
      if (condition.length > 1) return condition;
    }
  }
  return null;
}
