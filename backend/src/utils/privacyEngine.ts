/**
 * privacyEngine.ts — HealthSphere Privacy Engine (Node.js / TypeScript)
 * ======================================================================
 *
 * PURPOSE
 * -------
 * Implements differential-privacy simulation via Gaussian (Box-Muller) noise.
 * Noise is injected ONLY at read / export / analytics time.
 * Raw values stored in MongoDB are NEVER mutated.
 *
 * WHY GAUSSIAN NOISE?
 * -------------------
 * The Gaussian mechanism is a foundational primitive of differential privacy
 * (Dwork & Roth, 2014).  Adding N(0, σ²) noise to a numeric value:
 *
 *   • Prevents exact recovery of the original from the output alone.
 *   • Preserves aggregate statistics (mean, variance) across many records —
 *     the dataset remains analytically useful.
 *   • Is configurable: a larger σ (stdDev) trades accuracy for privacy.
 *
 * TRADE-OFFS
 * ----------
 *   LOW  (stdDev = 0.5) — minimal distortion; internal dashboards.
 *   MED  (stdDev = 1.0) — balanced; de-identified reports.
 *   HIGH (stdDev = 2.0) — strong obfuscation; external data sharing.
 *
 * PRIVACY MODE SWITCH
 * -------------------
 *   PRIVACY_MODE=on  (default) → noise applied
 *   PRIVACY_MODE=off           → original values returned unchanged
 *
 * VALIDATION
 * ----------
 *   All results are clipped at 0 (no negative health metrics) and at
 *   optional caller-supplied upper bounds for realistic ranges.
 */

// ── Privacy level presets ────────────────────────────────────────────────────

export type PrivacyLevel = 'low' | 'medium' | 'high';

/** Maps named privacy levels to standard-deviation values. */
export const LEVEL_STD: Record<PrivacyLevel, number> = {
  low:    0.5,
  medium: 1.0,
  high:   2.0,
};

// ── Per-field noise configuration ────────────────────────────────────────────

export interface FieldNoiseConfig {
  stdDev:  number;
  clipMin: number | null;
  clipMax: number | null;
}

/** Default per-field noise rules for common health metrics. */
export const FIELD_NOISE_CONFIG: Record<string, FieldNoiseConfig> = {
  age:               { stdDev: 1.0, clipMin: 0,    clipMax: 120  },
  symptomCount:      { stdDev: 0.5, clipMin: 0,    clipMax: null },
  heartRate:         { stdDev: 2.0, clipMin: 30,   clipMax: 300  },
  bloodPressure:     { stdDev: 3.0, clipMin: 50,   clipMax: 250  },
  temperature:       { stdDev: 0.2, clipMin: 35.0, clipMax: 42.0 },
  weight:            { stdDev: 1.0, clipMin: 1,    clipMax: null },
  height:            { stdDev: 0.5, clipMin: 50,   clipMax: null },
  bmi:               { stdDev: 0.3, clipMin: 10,   clipMax: 60   },
  glucose:           { stdDev: 2.0, clipMin: 20,   clipMax: 600  },
  oxygenSaturation:  { stdDev: 0.5, clipMin: 70,   clipMax: 100  },
};

// ── Privacy mode (global switch) ─────────────────────────────────────────────

/**
 * Returns true when the privacy engine is active.
 * Reads PRIVACY_MODE from process.env; defaults to ON.
 */
export function isPrivacyModeOn(): boolean {
  const raw = (process.env.PRIVACY_MODE ?? 'on').trim().toLowerCase();
  return !['off', 'false', '0', 'no'].includes(raw);
}

// ── Box-Muller Gaussian RNG ──────────────────────────────────────────────────

/**
 * Generates a single sample from N(mean, stdDev²) using the Box-Muller transform.
 * Pure JavaScript — no external library required.
 */
function gaussianSample(mean = 0, stdDev = 1): number {
  // Avoid log(0): resample if u1 === 0
  let u1 = 0;
  while (u1 === 0) u1 = Math.random();
  const u2 = Math.random();

  const randStdNormal =
    Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

  return mean + stdDev * randStdNormal;
}

// ── Core scalar noise function ────────────────────────────────────────────────

export interface NoiseOptions {
  mean?:         number;       // noise distribution mean (default 0)
  stdDev?:       number;       // std deviation (default 1)
  clipMin?:      number | null;// floor after noise (default 0)
  clipMax?:      number | null;// ceiling after noise (default null = uncapped)
  privacyMode?:  boolean;      // override PRIVACY_MODE env flag
}

/**
 * Inject Gaussian noise into a single numeric health metric.
 *
 * The raw `value` is NEVER stored back — call this ONLY when preparing
 * data for analytics, export, or external API responses.
 *
 * @example
 * const noisyHeartRate = addGaussianNoise(72, { stdDev: 2, clipMax: 300 });
 * const noisyAge       = addGaussianNoise(45, { stdDev: 1, clipMax: 120 });
 */
export function addGaussianNoise(value: number, opts: NoiseOptions = {}): number {
  const {
    mean        = 0,
    stdDev      = 1,
    clipMin     = 0,
    clipMax     = null,
    privacyMode,
  } = opts;

  const modeOn = privacyMode !== undefined ? privacyMode : isPrivacyModeOn();
  if (!modeOn) return value;

  let result = value + gaussianSample(mean, stdDev);

  if (clipMin !== null) result = Math.max(result, clipMin);
  if (clipMax !== null) result = Math.min(result, clipMax);

  return result;
}

/**
 * Convenience wrapper: choose a named privacy level instead of a raw stdDev.
 *
 * @example
 * const noisyAge = addGaussianNoisePreset(34, 'high', { clipMax: 120 });
 */
export function addGaussianNoisePreset(
  value:  number,
  level:  PrivacyLevel = 'medium',
  opts:   Omit<NoiseOptions, 'stdDev'> = {},
): number {
  return addGaussianNoise(value, { ...opts, stdDev: LEVEL_STD[level] });
}

// ── Object / record noise function ───────────────────────────────────────────

export type SensitiveRecord = Record<string, unknown>;

/**
 * Apply field-aware Gaussian noise to a single record object.
 *
 * Only keys listed in `FIELD_NOISE_CONFIG` (or the caller-supplied `fields`)
 * are noised.  String / boolean / array fields are left unchanged.
 * The original object is NEVER mutated — a new object is returned.
 *
 * @param record       Raw patient / analytics record.
 * @param level        Privacy preset ('low' | 'medium' | 'high').
 * @param fields       Override which fields to noise (defaults to FIELD_NOISE_CONFIG keys).
 * @param privacyMode  Override env flag.
 *
 * @example
 * const safe = applyNoiseToRecord(patientVitals, 'high');
 * // safe.heartRate ≈ 73.4  (was 72, noise applied)
 * // safe.name === 'Alice'  (unchanged)
 */
export function applyNoiseToRecord(
  record:       SensitiveRecord,
  level:        PrivacyLevel = 'medium',
  fields?:      string[],
  privacyMode?: boolean,
): SensitiveRecord {
  const modeOn = privacyMode !== undefined ? privacyMode : isPrivacyModeOn();
  if (!modeOn) return { ...record };

  const levelScale = LEVEL_STD[level];
  const targetKeys = fields ?? Object.keys(FIELD_NOISE_CONFIG);

  const result: SensitiveRecord = { ...record };

  for (const key of targetKeys) {
    const raw = record[key];
    if (typeof raw !== 'number') continue;

    const cfg = FIELD_NOISE_CONFIG[key] ?? { stdDev: 1.0, clipMin: 0, clipMax: null };
    const effectiveStd = cfg.stdDev * levelScale;

    result[key] = addGaussianNoise(raw, {
      stdDev:      effectiveStd,
      clipMin:     cfg.clipMin,
      clipMax:     cfg.clipMax,
      privacyMode: true, // already gate-checked above
    });
  }

  return result;
}

/**
 * Apply Gaussian noise to an array of records.
 * Wraps `applyNoiseToRecord` — original array is NOT mutated.
 *
 * @example
 * const safeRecords = applyNoiseToRecords(analyticsRows, 'medium');
 */
export function applyNoiseToRecords(
  records:      SensitiveRecord[],
  level:        PrivacyLevel = 'medium',
  fields?:      string[],
  privacyMode?: boolean,
): SensitiveRecord[] {
  const modeOn = privacyMode !== undefined ? privacyMode : isPrivacyModeOn();
  if (!modeOn) return records.map(r => ({ ...r }));

  return records.map(r => applyNoiseToRecord(r, level, fields, true));
}

// ── Privacy metadata helper ───────────────────────────────────────────────────

/**
 * Returns a metadata block to attach to any API response that includes
 * privacy-protected values, so clients know noise was applied.
 */
export function privacyMetadata(level: PrivacyLevel | 'off' = 'off') {
  return {
    privacyApplied: level !== 'off',
    privacyLevel:   level,
    stdDev:         level !== 'off' ? LEVEL_STD[level as PrivacyLevel] : 0,
    note: 'Raw values are stored in the database and never exposed. ' +
          'Gaussian noise (Box-Muller) was added to all numeric health metrics ' +
          'in this response to simulate differential privacy.',
  };
}
