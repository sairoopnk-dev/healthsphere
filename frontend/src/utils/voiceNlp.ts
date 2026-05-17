/**
 * Voice NLP Intent Parser — v2
 *
 * Improvements over v1:
 *  ✔ chrono-node for accurate, order-independent date + time parsing
 *  ✔ Exhaustive medical specialty synonym map (50+ aliases)
 *  ✔ Doctor name extraction with strict temporal stop-word boundary
 *  ✔ Multi-pattern intent detection (book, specialty search, nearest, availability)
 *  ✔ No hardcoded string comparisons for date/time
 *  ✔ Works for ANY sentence order
 */

import * as chrono from 'chrono-node';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceIntent =
  | { type: 'book'; doctor?: string; hospital?: string; date?: string; time?: string }
  | { type: 'search_specialty'; specialty: string; hospital?: string }
  | { type: 'find_nearest'; specialty: string; hospital?: string }
  | { type: 'check_availability'; doctor: string; date?: string; time?: string }
  | { type: 'confirm_yes' }
  | { type: 'confirm_no' }
  | { type: 'unknown' };

// ─────────────────────────────────────────────────────────────────────────────
// PART 1 — SPECIALTY MAP (50+ aliases → canonical DB values)
// ─────────────────────────────────────────────────────────────────────────────

const SPECIALTY_MAP: Record<string, string> = {
  // Cardiology
  'cardiology': 'Cardiologist',
  'cardiologist': 'Cardiologist',
  'heart doctor': 'Cardiologist',
  'heart specialist': 'Cardiologist',
  'cardiac': 'Cardiologist',
  'heart': 'Cardiologist',

  // Dermatology
  'dermatology': 'Dermatologist',
  'dermatologist': 'Dermatologist',
  'skin doctor': 'Dermatologist',
  'skin specialist': 'Dermatologist',
  'skin': 'Dermatologist',

  // Neurology
  'neurology': 'Neurologist',
  'neurologist': 'Neurologist',
  'brain doctor': 'Neurologist',
  'brain specialist': 'Neurologist',
  'nerve doctor': 'Neurologist',
  'brain': 'Neurologist',

  // Orthopedics
  'orthopedic': 'Orthopedic',
  'orthopaedic': 'Orthopedic',
  'orthopedics': 'Orthopedic',
  'orthopedist': 'Orthopedic',
  'bone doctor': 'Orthopedic',
  'bone specialist': 'Orthopedic',
  'joint doctor': 'Orthopedic',
  'joint specialist': 'Orthopedic',
  'bone': 'Orthopedic',

  // Pediatrics
  'pediatrics': 'Pediatrician',
  'pediatrician': 'Pediatrician',
  'paediatrician': 'Pediatrician',
  'child doctor': 'Pediatrician',
  'children doctor': 'Pediatrician',
  'kids doctor': 'Pediatrician',

  // Psychiatry
  'psychiatry': 'Psychiatrist',
  'psychiatrist': 'Psychiatrist',
  'mental health doctor': 'Psychiatrist',
  'mental doctor': 'Psychiatrist',

  // Ophthalmology
  'ophthalmology': 'Ophthalmologist',
  'ophthalmologist': 'Ophthalmologist',
  'eye doctor': 'Ophthalmologist',
  'eye specialist': 'Ophthalmologist',
  'eye': 'Ophthalmologist',

  // Gynecology
  'gynecology': 'Gynecologist',
  'gynaecology': 'Gynecologist',
  'gynecologist': 'Gynecologist',
  'gynaecologist': 'Gynecologist',
  'women doctor': 'Gynecologist',
  'ladies doctor': 'Gynecologist',

  // Urology
  'urology': 'Urologist',
  'urologist': 'Urologist',

  // Oncology
  'oncology': 'Oncologist',
  'oncologist': 'Oncologist',
  'cancer doctor': 'Oncologist',
  'cancer specialist': 'Oncologist',
  'cancer': 'Oncologist',

  // Endocrinology
  'endocrinology': 'Endocrinologist',
  'endocrinologist': 'Endocrinologist',
  'diabetes doctor': 'Endocrinologist',
  'thyroid doctor': 'Endocrinologist',
  'hormone doctor': 'Endocrinologist',

  // Gastroenterology
  'gastroenterology': 'Gastroenterologist',
  'gastroenterologist': 'Gastroenterologist',
  'stomach doctor': 'Gastroenterologist',
  'gut doctor': 'Gastroenterologist',
  'liver doctor': 'Gastroenterologist',
  'stomach': 'Gastroenterologist',

  // Pulmonology
  'pulmonology': 'Pulmonologist',
  'pulmonologist': 'Pulmonologist',
  'lung doctor': 'Pulmonologist',
  'respiratory doctor': 'Pulmonologist',
  'lung': 'Pulmonologist',

  // Nephrology
  'nephrology': 'Nephrologist',
  'nephrologist': 'Nephrologist',
  'kidney doctor': 'Nephrologist',
  'kidney specialist': 'Nephrologist',
  'kidney': 'Nephrologist',

  // Rheumatology
  'rheumatology': 'Rheumatologist',
  'rheumatologist': 'Rheumatologist',
  'arthritis doctor': 'Rheumatologist',

  // Surgery
  'surgery': 'Surgeon',
  'surgeon': 'Surgeon',

  // ENT
  'ent': 'Ent',
  'ear nose throat': 'Ent',
  'ear doctor': 'Ent',
  'nose doctor': 'Ent',
  'throat doctor': 'Ent',
  'ear specialist': 'Ent',

  // Dentistry
  'dentistry': 'Dentist',
  'dentist': 'Dentist',
  'dental doctor': 'Dentist',
  'teeth doctor': 'Dentist',
  'tooth doctor': 'Dentist',
  'teeth': 'Dentist',
  'tooth': 'Dentist',

  // General / Family Medicine
  'general physician': 'General Physician',
  'general': 'General Physician',
  'physician': 'General Physician',
  'family doctor': 'General Physician',
  'gp': 'General Physician',
  'general medicine': 'General Physician',
};

// ─────────────────────────────────────────────────────────────────────────────
// PART 2 — DATE / TIME PARSING (via chrono-node)
// ─────────────────────────────────────────────────────────────────────────────

/** Converts a Date to YYYY-MM-DD string in local time */
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Rounds minutes to nearest 30 and formats as "HH:MM AM/PM" */
function formatSlotTime(d: Date): string {
  let h = d.getHours();
  const raw = d.getMinutes();
  const m = raw < 15 ? 0 : raw < 45 ? 30 : 0;
  if (raw >= 45) h += 1;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Parse a natural language date from the transcript using chrono-node.
 * Returns YYYY-MM-DD or undefined.
 */
export function parseDate(text: string): string | undefined {
  const results = chrono.parse(text, new Date(), { forwardDate: true });
  if (!results.length) return undefined;
  const d = results[0].start.date();
  return toYMD(d);
}

/**
 * Parse a natural language time from the transcript using chrono-node.
 * Returns "HH:MM AM/PM" or undefined.
 */
export function parseTime(text: string): string | undefined {
  const results = chrono.parse(text, new Date(), { forwardDate: true });
  if (!results.length) return undefined;

  const comp = results[0].start;
  // Only return a time if the user actually specified one (not just a date)
  if (!comp.isCertain('hour')) return undefined;

  const d = comp.date();
  return formatSlotTime(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 3 — DOCTOR NAME EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

/** Words that must NEVER appear inside a doctor's name */
const NAME_STOP_WORDS = new Set([
  'tomorrow', 'today', 'yesterday', 'morning', 'afternoon', 'evening', 'night',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december',
  'next', 'this', 'last', 'on', 'at', 'in', 'by', 'for', 'from', 'with', 'the',
  'am', 'pm', 'a.m', 'p.m',
  'appointment', 'please', 'want', 'wanna', 'need', 'book', 'schedule',
  'visit', 'see', 'check', 'find', 'nearest', 'available', 'day', 'date',
  'time', 'hospital', 'clinic', 'and', 'or', 'a', 'an',
]);

/**
 * Walk the raw-capture token by token, stopping at the first stop-word or digit.
 * Returns at most a 2-token name (First Last).
 */
function safeNameTokens(raw: string): string {
  const tokens = raw.trim().split(/\s+/);
  const kept: string[] = [];
  for (const tok of tokens) {
    if (NAME_STOP_WORDS.has(tok.toLowerCase())) break;
    if (/^\d/.test(tok)) break;
    // Skip very short "words" that are likely mis-heard conjunctions
    if (tok.length < 2) break;
    kept.push(tok);
    if (kept.length === 2) break;
  }
  return kept.join(' ').trim();
}

export function extractDoctor(text: string): string | undefined {
  // 1. "Dr." / "Doctor" prefix — highest confidence
  const drMatch = text.match(/\b(?:dr\.?|doctor)\s+([a-zA-Z].+)/i);
  if (drMatch) {
    const name = safeNameTokens(drMatch[1]);
    if (name) return name;
  }

  // 2. "see / visit / consult / meet (Dr?) <Name>"
  const seeMatch = text.match(
    /\b(?:see|visit|consult|meet|wanna\s+see|want\s+to\s+see)\s+(?:dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
  );
  if (seeMatch) {
    const name = safeNameTokens(seeMatch[1]);
    if (name) return name;
  }

  // 3. "appointment with <Name>"
  const withMatch = text.match(/\bappointment\s+with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (withMatch) {
    const name = safeNameTokens(withMatch[1]);
    if (name) return name;
  }

  // 4. Bare "with <ProperNoun>" fallback
  const bareWithMatch = text.match(/\bwith\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
  if (bareWithMatch) {
    const name = safeNameTokens(bareWithMatch[1]);
    if (name) return name;
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 4 — SPECIALTY EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

export function extractSpecialty(text: string): string | undefined {
  const lower = text.toLowerCase();

  // Try multi-word phrases first (longest match wins)
  const sortedKeys = Object.keys(SPECIALTY_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      return SPECIALTY_MAP[key];
    }
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 5 — HOSPITAL EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

export function extractHospital(text: string): string | undefined {
  const lower = text.toLowerCase();
  const match = text.match(
    /\b(?:at|in)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*?)(?:\s+(?:hospital|hospitals|clinic|centre|center))?\s*(?:$|tomorrow|today|on|at\s+\d)/i
  );
  if (match) {
    const raw = match[1].trim();
    // Filter out known stop-words
    if (NAME_STOP_WORDS.has(raw.toLowerCase())) return undefined;
    // Filter out known specialty names
    if (extractSpecialty(raw)) return undefined;
    return raw;
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 6 — INTENT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/** Patterns for the find_nearest intent */
const NEAREST_PATTERNS = [
  /\bnearest\b/,
  /\bnearby\b/,
  /\bnear\s+me\b/,
  /\bclosest\b/,
  /\bfind\s+(?:a\s+)?nearby\b/,
  /\bnear\s+(?:my\s+)?(?:location|place|area)\b/,
];

/** Patterns for the search_specialty intent */
const SPECIALTY_SEARCH_PATTERNS = [
  /\bwho\s+(?:are|is)\b/,
  /\bavailable\s+\w+ists?\b/,
  /\bshow\s+(?:me\s+)?(?:all\s+)?\w+ists?\b/,
  /\bfind\s+(?:me\s+)?(?:a\s+)?\w+ist\b/,
  /\blist\s+\w+ists?\b/,
  /\bsearch\s+(?:for\s+)?(?:a\s+)?\w+ist\b/,
];

/** Patterns for the book intent */
const BOOK_PATTERNS = [
  /\bbook\b/,
  /\bappointment\b/,
  /\bschedule\b/,
  /\bi\s+want\b/,
  /\bi\s+need\b/,
  /\bwanna\b/,
  /\bsee\s+(?:a\s+)?(?:dr\.?|doctor)?\s*[A-Z]/i,
  /\bvisit\b/,
  /\bconsult\b/,
  /\bmeet\b/,
];

/** Patterns for availability check */
const AVAILABILITY_PATTERNS = [
  /\b(?:check|is)\s+.*\bavailable\b/,
  /\bavailability\b/,
  /\bcheck\s+slot\b/,
  /\bcheck\s+timing\b/,
];

// ─────────────────────────────────────────────────────────────────────────────
// PART 7 — MAIN PARSER
// ─────────────────────────────────────────────────────────────────────────────

export function parseVoiceIntent(transcript: string): VoiceIntent {
  const lower = transcript.toLowerCase().trim();

  // ── Yes / No confirmation ──
  if (/^(yes|yeah|yep|sure|confirm|book it|go ahead|okay|ok|please|do it)\b/.test(lower)) {
    return { type: 'confirm_yes' };
  }
  if (/^(no|nope|cancel|never mind|stop|don't|dont)\b/.test(lower)) {
    return { type: 'confirm_no' };
  }

  // ── Find nearest (location-based) ──
  const isNearest = NEAREST_PATTERNS.some(p => p.test(lower));
  if (isNearest) {
    const specialty = extractSpecialty(transcript);
    if (specialty) {
      return { type: 'find_nearest', specialty, hospital: extractHospital(transcript) };
    }
  }

  // ── Specialty search (non-location) ──
  const isSpecialtySearch = SPECIALTY_SEARCH_PATTERNS.some(p => p.test(lower));
  if (isSpecialtySearch) {
    const specialty = extractSpecialty(transcript);
    if (specialty) {
      return { type: 'search_specialty', specialty, hospital: extractHospital(transcript) };
    }
  }

  // ── Availability check ──
  const isAvailability = AVAILABILITY_PATTERNS.some(p => p.test(lower));
  if (isAvailability) {
    const doctor = extractDoctor(transcript);
    if (doctor) {
      return {
        type: 'check_availability',
        doctor,
        date: parseDate(transcript),
        time: parseTime(transcript),
      };
    }
  }

  // ── Booking intent ──
  const isBooking = BOOK_PATTERNS.some(p => p.test(lower));
  if (isBooking) {
    // If no doctor name detected but a specialty is, treat as specialty search
    const doctor = extractDoctor(transcript);
    const specialty = extractSpecialty(transcript);

    if (!doctor && specialty) {
      return { type: 'search_specialty', specialty, hospital: extractHospital(transcript) };
    }

    return {
      type: 'book',
      doctor,
      hospital: extractHospital(transcript),
      date: parseDate(transcript),
      time: parseTime(transcript),
    };
  }

  // ── Fallback: doctor name detected → assume booking ──
  const doctor = extractDoctor(transcript);
  if (doctor) {
    return {
      type: 'book',
      doctor,
      hospital: extractHospital(transcript),
      date: parseDate(transcript),
      time: parseTime(transcript),
    };
  }

  // ── Fallback: specialty detected → specialty search ──
  const specialty = extractSpecialty(transcript);
  if (specialty) {
    return { type: 'search_specialty', specialty, hospital: extractHospital(transcript) };
  }

  return { type: 'unknown' };
}
