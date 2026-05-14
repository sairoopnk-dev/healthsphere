import express from 'express';
import {
  getNotifications,
  createNotification,
  markOneRead,
  markAllRead,
} from '../controllers/notificationController';

const router = express.Router();

router.get('/:patientId', getNotifications);    // GET all for patient
router.post('/', createNotification);  // POST create
router.put('/:notifId/read', markOneRead);         // mark single read
router.put('/:patientId/read-all', markAllRead);         // mark all read

export default router;
