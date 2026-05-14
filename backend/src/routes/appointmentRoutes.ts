import { Router } from 'express';
import {
  createAppointment,
  getAppointments,
  getPatientAppointments,
  getPatientTimeline,
  updateAppointmentStatus,
  prioritizeAppointment,
} from '../controllers/appointmentController';

const router = Router();

// POST /api/appointments
router.post('/', createAppointment);

// GET /api/appointments?patientId=xxx  or  ?doctorId=xxx
router.get('/', getAppointments);

// GET /api/appointments/patient/:patientId/timeline — merged timeline
router.get('/patient/:patientId/timeline', getPatientTimeline);

// GET /api/appointments/patient/:patientId — all patient appointments (sorted)
router.get('/patient/:patientId', getPatientAppointments);

// PATCH /api/appointments/:id/status  (accepts diagnosis + reportUrl)
router.patch('/:id/status', updateAppointmentStatus);

// PATCH /api/appointments/:id/prioritize
router.patch('/:id/prioritize', prioritizeAppointment);

export default router;
