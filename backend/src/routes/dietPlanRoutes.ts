import express from 'express';
import { getDietPlan, generateDietPlan, updateProfileForDiet, getRecentSymptomsForUser } from '../controllers/dietPlanController';

const router = express.Router();

router.get('/:patientId',                  getDietPlan);                  // GET saved plan
router.post('/:patientId/generate',        generateDietPlan);             // POST generate plan
router.patch('/:patientId/update-profile', updateProfileForDiet);         // PATCH height/weight
router.get('/:patientId/recent-symptoms',  getRecentSymptomsForUser);     // GET recent symptoms for toggle

export default router;
