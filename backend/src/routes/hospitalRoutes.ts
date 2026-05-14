import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  createHospital,
  addDoctorToHospital,
  getHospitalDoctors,
  getHospitalById,
  updateHospital,
} from '../controllers/hospitalController';

const router = express.Router();

// Every hospital route is gated by session auth (Req 9.6).
router.use(requireAuth);

router.post('/create',      createHospital);
router.post('/add-doctor',  addDoctorToHospital);
router.get ('/doctors',     getHospitalDoctors);
router.put ('/update',      updateHospital);
router.get ('/:hospitalId', getHospitalById);

export default router;
