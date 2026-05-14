import { Request, Response } from 'express';
import Notification from '../models/Notification';

// ── GET all notifications for a patient ─────────────────────────────────────
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const notifications = await Notification.find({ patientId }).sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── CREATE a notification ────────────────────────────────────────────────────
export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, type, text, date } = req.body;
    if (!patientId || !text) {
      res.status(400).json({ message: 'patientId and text are required' });
      return;
    }
    const notification = await Notification.create({ patientId, type: type || 'general', text, date: date || '' });
    res.status(201).json({ success: true, notification });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── MARK single notification as read ────────────────────────────────────────
export const markOneRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { notifId } = req.params;
    const notif = await Notification.findByIdAndUpdate(
      notifId,
      { isRead: true },
      { new: true }
    );
    if (!notif) { res.status(404).json({ message: 'Notification not found' }); return; }
    res.json({ success: true, notification: notif });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── MARK ALL notifications as read for a patient ─────────────────────────────
export const markAllRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    await Notification.updateMany({ patientId, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};
