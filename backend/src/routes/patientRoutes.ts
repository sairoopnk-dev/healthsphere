import express from 'express';
import {
  getPatientDashboard,
  setupPatientProfile,
  updatePatientProfile,
  addPatientAddress,
  updatePatientAddress,
  deletePatientAddress,
  setDefaultAddress,
} from '../controllers/patientController';

const router = express.Router();

router.get('/:id/dashboard',                              getPatientDashboard);
router.put('/:patientId/setup',                           setupPatientProfile);
router.put('/:patientId/profile',                         updatePatientProfile);

// Address management
router.post('/:patientId/addresses',                      addPatientAddress);
router.put('/:patientId/addresses/:addressId',            updatePatientAddress);
router.delete('/:patientId/addresses/:addressId',         deletePatientAddress);
router.put('/:patientId/addresses/:addressId/default',    setDefaultAddress);

export default router;
