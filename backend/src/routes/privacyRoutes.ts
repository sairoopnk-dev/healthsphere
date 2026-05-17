/**
 * privacyRoutes.ts — HealthSphere Privacy Engine Routes
 * ======================================================
 *
 * Mount at:  /api/privacy
 *
 * Routes
 * ------
 *   GET  /api/privacy/status         → Engine config & active levels
 *   POST /api/privacy/noise          → Noise a single record
 *   POST /api/privacy/noise-batch    → Noise an array of records
 *   POST /api/privacy/noise-scalar   → Noise a single numeric value
 */

import { Router } from 'express';
import {
  getPrivacyStatus,
  applyNoiseToSingle,
  applyNoiseToBatch,
  applyNoiseToScalar,
} from '../controllers/privacyController';

const router = Router();

router.get('/status',       getPrivacyStatus);
router.post('/noise',       applyNoiseToSingle);
router.post('/noise-batch', applyNoiseToBatch);
router.post('/noise-scalar',applyNoiseToScalar);

export default router;
