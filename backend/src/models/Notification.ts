import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  patientId: string;
  type: 'appointment' | 'prescription' | 'lab_report' | 'general';
  text: string;
  date: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    patientId: { type: String, required: true, index: true },
    type:      { type: String, default: 'general' },
    text:      { type: String, required: true },
    date:      { type: String, default: '' },
    isRead:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
