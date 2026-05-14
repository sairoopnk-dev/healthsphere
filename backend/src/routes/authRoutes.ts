import express from 'express';
import { registerPatient, registerDoctor, loginUser, logoutUser } from '../controllers/authController';

const router = express.Router();

router.post('/patient/register', registerPatient);
router.post('/doctor/register', registerDoctor);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

export default router;
