import express from 'express';
import {
  createPrescription,
  getPatientPrescriptions,
  getActiveMedications,
  getPastMedications,
} from '../controllers/prescriptionController';

const router = express.Router();

router.post('/:patientId',          createPrescription);        // Doctor adds prescription
router.get('/:patientId',           getPatientPrescriptions);   // All prescriptions
router.get('/:patientId/active',    getActiveMedications);      // Active meds (with daysLeft)
router.get('/:patientId/past',      getPastMedications);        // Completed meds (history)

export default router;
