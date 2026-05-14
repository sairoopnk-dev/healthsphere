import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  patientId:    string;
  medicineName: string;
  dosage:       string;
  times:        string[];     // e.g. ["08:00","14:00","20:00"]
  notes?:       string;
  timezone:     string;       // "Asia/Kolkata"
  isActive:     boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

const ReminderSchema: Schema = new Schema(
  {
    patientId:    { type: String, required: true, index: true },
    medicineName: { type: String, required: true },
    dosage:       { type: String, required: true },
    times:        { type: [String], required: true },    // 24h "HH:MM"
    notes:        { type: String, default: '' },
    timezone:     { type: String, default: 'Asia/Kolkata' },
    isActive:     { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Fast lookup: all active reminders for a patient
ReminderSchema.index({ patientId: 1, isActive: 1 });

export default mongoose.model<IReminder>('Reminder', ReminderSchema);
