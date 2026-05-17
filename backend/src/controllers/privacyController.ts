/**
 * privacyController.ts — HealthSphere Privacy Engine Controller
 * ==============================================================
 *
 * Exposes three endpoints:
 *
 *   GET  /api/privacy/status
 *     → Returns current privacy mode and level configuration.
 *
 *   POST /api/privacy/noise
 *     → Accepts a JSON record and returns a noise-protected copy.
 *       Raw data is NOT stored — noise is applied only to the response.
 *
 *   POST /api/privacy/noise-batch
 *     → Applies noise to an array of records.
 *       Useful for analytics pipeline integration.
 *
 * INTEGRATION POINTS
 * ------------------
 * Import `applyNoiseToRecord` / `applyNoiseToRecords` from privacyEngine.ts
 * into any controller that exposes analytics, reports, or external data.
 *
 * Example in patientController.ts:
 *   const safeVitals = applyNoiseToRecord(vitals, 'medium');
 *   res.json({ vitals: safeVitals, ...privacyMetadata('medium') });
 */

import { Request, Response } from 'express';
import {
  addGaussianNoise,
  addGaussianNoisePreset,
  applyNoiseToRecord,
  applyNoiseToRecords,
  privacyMetadata,
  isPrivacyModeOn,
  LEVEL_STD,
  FIELD_NOISE_CONFIG,
  PrivacyLevel,
} from '../utils/privacyEngine';

// ── Allowed privacy levels ────────────────────────────────────────────────────
const VALID_LEVELS = new Set<string>(['low', 'medium', 'high']);

function parseLevel(raw: unknown): PrivacyLevel {
  const s = String(raw ?? 'medium').toLowerCase();
  if (VALID_LEVELS.has(s)) return s as PrivacyLevel;
  return 'medium';
}

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/privacy/status
   Returns current privacy engine settings — useful for admin dashboards.
═══════════════════════════════════════════════════════════════════════════ */
export const getPrivacyStatus = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    privacyMode: isPrivacyModeOn() ? 'on' : 'off',
    levels: {
      low:    { stdDev: LEVEL_STD.low,    description: 'Minimal noise — internal analytics' },
      medium: { stdDev: LEVEL_STD.medium, description: 'Balanced — de-identified reports'   },
      high:   { stdDev: LEVEL_STD.high,   description: 'Strong obfuscation — external data' },
    },
    protectedFields: Object.keys(FIELD_NOISE_CONFIG),
    note: 'Raw DB values are NEVER modified. Gaussian noise is applied per-request only.',
  });
};

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/privacy/noise
   Body : { data: Record<string, unknown>, level?: 'low'|'medium'|'high' }
   Apply noise to a single health record.
═══════════════════════════════════════════════════════════════════════════ */
export const applyNoiseToSingle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, level } = req.body;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      res.status(400).json({
        success: false,
        message: '`data` must be a non-array object containing health metrics.',
      });
      return;
    }

    const privLevel = parseLevel(level);
    const noisy     = applyNoiseToRecord(data, privLevel, undefined, true);

    res.json({
      success: true,
      data:    noisy,
      ...privacyMetadata(privLevel),
    });
  } catch (err: any) {
    console.error('[PrivacyEngine] applyNoiseToSingle error:', err.message);
    res.status(500).json({ success: false, message: 'Noise injection failed', error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/privacy/noise-batch
   Body : { records: Record<string, unknown>[], level?: 'low'|'medium'|'high' }
   Apply noise to an array of health records (analytics / report pipeline).
═══════════════════════════════════════════════════════════════════════════ */
export const applyNoiseToBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { records, level } = req.body;

    if (!Array.isArray(records)) {
      res.status(400).json({
        success: false,
        message: '`records` must be an array of health metric objects.',
      });
      return;
    }

    if (records.length > 10_000) {
      res.status(413).json({
        success: false,
        message: 'Batch size exceeds 10,000 records. Split into smaller batches.',
      });
      return;
    }

    const privLevel = parseLevel(level);
    const noisy     = applyNoiseToRecords(records, privLevel, undefined, true);

    res.json({
      success:    true,
      data:       noisy,
      totalRows:  noisy.length,
      ...privacyMetadata(privLevel),
    });
  } catch (err: any) {
    console.error('[PrivacyEngine] applyNoiseToBatch error:', err.message);
    res.status(500).json({ success: false, message: 'Batch noise injection failed', error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/privacy/noise-scalar
   Body : { value: number, stdDev?: number, level?: string, clipMin?: number, clipMax?: number }
   Inject noise into a single scalar value.  Good for testing / demos.
═══════════════════════════════════════════════════════════════════════════ */
export const applyNoiseToScalar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { value, stdDev, level, clipMin, clipMax } = req.body;

    if (typeof value !== 'number') {
      res.status(400).json({ success: false, message: '`value` must be a number.' });
      return;
    }

    let noisy: number;
    if (stdDev !== undefined) {
      noisy = addGaussianNoise(value, {
        stdDev:  Number(stdDev),
        clipMin: clipMin !== undefined ? Number(clipMin) : 0,
        clipMax: clipMax !== undefined ? Number(clipMax) : null,
        privacyMode: true,
      });
    } else {
      const privLevel = parseLevel(level);
      noisy = addGaussianNoisePreset(value, privLevel, {
        clipMin: clipMin !== undefined ? Number(clipMin) : 0,
        clipMax: clipMax !== undefined ? Number(clipMax) : null,
        privacyMode: true,
      });
    }

    res.json({
      success:       true,
      originalValue: value,
      noisyValue:    noisy,
      delta:         parseFloat((noisy - value).toFixed(6)),
      ...privacyMetadata(parseLevel(level)),
    });
  } catch (err: any) {
    console.error('[PrivacyEngine] applyNoiseToScalar error:', err.message);
    res.status(500).json({ success: false, message: 'Scalar noise injection failed', error: err.message });
  }
};
