/**
 * Voice NLP Intent Parser
 * Parses spoken transcripts into structured intents for appointment booking.
 * Pure TypeScript — no external dependencies.
 */

export type VoiceIntent =
  | { type: 'book'; doctor?: string; hospital?: string; date?: string; time?: string }
  | { type: 'search_specialty'; specialty: string; hospital?: string }
  | { type: 'find_nearest'; specialty: string; hospital?: string }
  | { type: 'check_availability'; doctor: string; date?: string; time?: string }
  | { type: 'confirm_yes' }
  | { type: 'confirm_no' }
  | { type: 'unknown' };

// ── Date Parsing ─────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

export function parseDate(text: string): string | undefined {
  const lower = text.toLowerCase();

  // "today"
  if (/\btoday\b/.test(lower)) {
    return toYMD(new Date());
  }

  // "tomorrow"
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toYMD(d);
  }

  // "day after tomorrow"
  if (/\bday after tomorrow\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return toYMD(d);
  }

  // "next monday", "this friday", etc.
  const dayMatch = lower.match(/\b(next|this)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (dayMatch) {
    const modifier = dayMatch[1]; // "next" or "this"
    const targetDay = DAY_MAP[dayMatch[2]];
    const now = new Date();
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;

    if (modifier === 'next') {
      if (diff <= 0) diff += 7;
    } else {
      // "this" — same week, but if today or past, go to next week
      if (diff <= 0) diff += 7;
    }

    const d = new Date();
    d.setDate(d.getDate() + diff);
    return toYMD(d);
  }

  // Standalone day name: "monday", "friday"
  const standaloneDayMatch = lower.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (standaloneDayMatch) {
    const targetDay = DAY_MAP[standaloneDayMatch[1]];
    const now = new Date();
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    const d = new Date();
    d.setDate(d.getDate() + diff);
    return toYMD(d);
  }

  return undefined;
}

// ── Time Parsing ─────────────────────────────────────────────────────────────

export function parseTime(text: string): string | undefined {
  const lower = text.toLowerCase();

  // "morning" → 09:00 AM
  if (/\bmorning\b/.test(lower)) return '09:00 AM';

  // "afternoon" → 02:00 PM
  if (/\bafternoon\b/.test(lower)) return '02:00 PM';

  // "evening" → 05:00 PM
  if (/\bevening\b/.test(lower)) return '05:00 PM';

  // "5 pm", "5:30 pm", "05:00 PM"
  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3].toUpperCase();

    // Round minutes to nearest 30
    const roundedM = m < 15 ? 0 : m < 45 ? 30 : 0;
    if (m >= 45) h += 1;

    // Format to slot format
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const displayAmpm = ampm === 'PM' && h < 12 ? 'PM' : ampm === 'AM' && h >= 12 ? 'AM' : ampm;

    return `${String(displayH).padStart(2, '0')}:${String(roundedM).padStart(2, '0')} ${displayAmpm}`;
  }

  // "17:00" (24-hour)
  const time24Match = lower.match(/\b(\d{1,2}):(\d{2})\b/);
  if (time24Match) {
    let h = parseInt(time24Match[1], 10);
    const m = parseInt(time24Match[2], 10);
    if (h >= 0 && h <= 23) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const roundedM = m < 15 ? 0 : m < 45 ? 30 : 0;
      return `${String(displayH).padStart(2, '0')}:${String(roundedM).padStart(2, '0')} ${ampm}`;
    }
  }

  return undefined;
}

// ── Entity Extraction ────────────────────────────────────────────────────────

export function extractDoctor(text: string): string | undefined {
  // Match: "Dr. Ravi", "Dr Ravi Kumar", "Doctor Ravi", "with Dr. Ravi"
  const match = text.match(/\b(?:dr\.?|doctor)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
  if (match) return match[1].trim();

  // Match: "with Ravi" (after "appointment with")
  const withMatch = text.match(/\bwith\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
  if (withMatch) return withMatch[1].trim();

  return undefined;
}

export function extractHospital(text: string): string | undefined {
  // "at Apollo", "at Apollo Hospital", "at Apollo Hospitals", "in Fortis"
  const match = text.match(/\b(?:at|in)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*?)(?:\s+(?:hospital|hospitals|clinic|centre|center))?\s*(?:$|tomorrow|today|on|at\s+\d)/i);
  if (match) {
    const raw = match[1].trim();
    // Filter out time/date words
    const stopWords = ['tomorrow', 'today', 'morning', 'afternoon', 'evening', 'next', 'this'];
    if (stopWords.includes(raw.toLowerCase())) return undefined;
    return raw;
  }

  return undefined;
}

export function extractSpecialty(text: string): string | undefined {
  const SPECIALTIES = [
    'cardiologist', 'dermatologist', 'neurologist', 'orthopedic',
    'pediatrician', 'psychiatrist', 'ophthalmologist', 'gynecologist',
    'urologist', 'oncologist', 'endocrinologist', 'gastroenterologist',
    'pulmonologist', 'nephrologist', 'rheumatologist', 'surgeon',
    'general physician', 'general', 'ent', 'dentist',
  ];

  const lower = text.toLowerCase();

  for (const spec of SPECIALTIES) {
    // Match plural forms too: "cardiologists"
    if (lower.includes(spec) || lower.includes(spec + 's')) {
      // Return singular form, title-cased
      return spec.charAt(0).toUpperCase() + spec.slice(1);
    }
  }

  // "heart doctor" → Cardiologist
  const synonyms: Record<string, string> = {
    'heart': 'Cardiologist',
    'skin': 'Dermatologist',
    'brain': 'Neurologist',
    'bone': 'Orthopedic',
    'child': 'Pediatrician',
    'children': 'Pediatrician',
    'eye': 'Ophthalmologist',
    'stomach': 'Gastroenterologist',
    'lung': 'Pulmonologist',
    'kidney': 'Nephrologist',
    'cancer': 'Oncologist',
    'teeth': 'Dentist',
    'tooth': 'Dentist',
    'ear': 'Ent',
    'nose': 'Ent',
    'throat': 'Ent',
  };

  for (const [keyword, specialty] of Object.entries(synonyms)) {
    if (lower.includes(keyword)) return specialty;
  }

  return undefined;
}

// ── Main Intent Parser ───────────────────────────────────────────────────────

export function parseVoiceIntent(transcript: string): VoiceIntent {
  const lower = transcript.toLowerCase().trim();

  // ── Yes/No confirmation ──
  if (/^(yes|yeah|yep|sure|confirm|book it|go ahead|okay|ok)\b/.test(lower)) {
    return { type: 'confirm_yes' };
  }
  if (/^(no|nope|cancel|never mind|stop)\b/.test(lower)) {
    return { type: 'confirm_no' };
  }

  // ── Find nearest: "find nearest cardiologist", "nearest dermatologist near me", "nearby dentists" ──
  const isFindNearest =
    /\bnearest\b/.test(lower) ||
    /\bnearby\b/.test(lower) ||
    /\bnear\s+me\b/.test(lower) ||
    /\bclosest\b/.test(lower) ||
    /\bfind\s+(?:a\s+)?nearby\b/.test(lower);

  if (isFindNearest) {
    const specialty = extractSpecialty(transcript);
    if (specialty) {
      const hospital = extractHospital(transcript);
      return { type: 'find_nearest', specialty, hospital };
    }
  }

  // ── Specialty search: "who are the cardiologists", "available cardiologists" ──
  const isSpecialtySearch =
    /\bwho\s+(?:are|is)\b/.test(lower) ||
    /\bavailable\s+\w+ists?\b/.test(lower) ||
    /\bshow\s+(?:me\s+)?(?:all\s+)?\w+ists?\b/.test(lower) ||
    /\bfind\s+(?:me\s+)?(?:a\s+)?\w+ist\b/.test(lower) ||
    /\blist\s+\w+ists?\b/.test(lower);

  if (isSpecialtySearch) {
    const specialty = extractSpecialty(transcript);
    if (specialty) {
      const hospital = extractHospital(transcript);
      return { type: 'search_specialty', specialty, hospital };
    }
  }

  // ── Availability check: "check if Dr X is available", "is Dr X available" ──
  const isAvailabilityCheck =
    /\b(?:check|is)\s+.*\bavailable\b/.test(lower) ||
    /\bavailability\b/.test(lower);

  if (isAvailabilityCheck) {
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
  const isBookingIntent =
    /\bbook\b/.test(lower) ||
    /\bappointment\b/.test(lower) ||
    /\bschedule\b/.test(lower) ||
    /\bi want\b/.test(lower) ||
    /\bi need\b/.test(lower);

  if (isBookingIntent) {
    return {
      type: 'book',
      doctor: extractDoctor(transcript),
      hospital: extractHospital(transcript),
      date: parseDate(transcript),
      time: parseTime(transcript),
    };
  }

  // ── Fallback: if doctor name detected, assume booking ──
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

  return { type: 'unknown' };
}
