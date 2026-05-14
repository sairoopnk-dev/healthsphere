/**
 * Symptom Checker Routes
 * Dedicated routes for the hybrid ML + AI symptom checker.
 * Completely isolated from other AI modules.
 */

import { Router } from 'express';
import {
  hybridPredict,
  mlOnlyPredict,
  modelHealth,
  generateQuestions,
} from '../controllers/symptomCheckerController';

const router = Router();

// POST /api/symptom-checker/hybrid-predict
// Main hybrid endpoint: ML first → AI fallback chain
router.post('/hybrid-predict', hybridPredict);

// POST /api/symptom-checker/ml-only
// Raw ML prediction without AI fallback
router.post('/ml-only', mlOnlyPredict);

// GET /api/symptom-checker/model-health
// Model health and pipeline status
router.get('/model-health', modelHealth);

// POST /api/symptom-checker/generate-questions
// Generate follow-up questions (isolated from main AI module)
router.post('/generate-questions', generateQuestions);

export default router;
