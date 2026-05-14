import { Router } from 'express';
import { createReminder, getReminders, deleteReminder } from '../controllers/reminderController';

const router = Router();

// Create reminder
router.post('/', createReminder);

// Get all reminders for a patient
router.get('/:patientId', getReminders);

// Delete (deactivate) a reminder
router.delete('/:id', deleteReminder);

export default router;
