import { Request, Response } from 'express';
import Reminder from '../models/Reminder';

/**
 * POST /api/reminders
 * Creates or UPDATES a reminder for a patient+medicine (upsert — no duplicates).
 */
export const createReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, medicineName, dosage, times, notes, timezone } = req.body;

    if (!patientId || !medicineName || !dosage || !Array.isArray(times) || times.length === 0) {
      res.status(400).json({
        success: false,
        message: 'patientId, medicineName, dosage, and times (non-empty array) are required.',
      });
      return;
    }

    // Upsert: if a reminder for this patient+medicine already exists, update it
    const reminder = await Reminder.findOneAndUpdate(
      { patientId, medicineName, isActive: true },
      {
        dosage,
        times,
        notes:    notes || '',
        timezone: timezone || 'Asia/Kolkata',
        isActive: true,
      },
      { new: true, upsert: true }  // create if not found
    );

    res.status(200).json({ success: true, data: reminder });
  } catch (err: any) {
    console.error('[Reminder] createReminder error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save reminder.' });
  }
};

/**
 * GET /api/reminders/:patientId
 * Returns all active reminders for a patient.
 */
export const getReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const reminders = await Reminder.find({ patientId, isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reminders });
  } catch (err: any) {
    console.error('[Reminder] getReminders error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch reminders.' });
  }
};

/**
 * DELETE /api/reminders/:id
 * Soft-deletes (deactivates) a reminder by its MongoDB _id.
 */
export const deleteReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!reminder) {
      res.status(404).json({ success: false, message: 'Reminder not found.' });
      return;
    }
    res.status(200).json({ success: true, message: 'Reminder deactivated.' });
  } catch (err: any) {
    console.error('[Reminder] deleteReminder error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete reminder.' });
  }
};
