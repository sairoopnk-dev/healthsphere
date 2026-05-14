import mongoose, { Schema, Document } from 'mongoose';

/**
 * DoctorAvailability
 * Stores per-date slot blocking data for a doctor.
 * Separate from the Doctor model's blockedDates (full-day) array.
 */
export interface IDoctorAvailability extends Document {
  doctorId: string;
  date: string;           // YYYY-MM-DD
  fullDayBlocked: boolean;
  blockedSlots: string[]; // e.g. ["10:00 AM", "10:30 AM"]
  updatedAt: Date;
}

const DoctorAvailabilitySchema: Schema = new Schema(
  {
    doctorId:        { type: String, required: true, index: true },
    date:            { type: String, required: true },           // YYYY-MM-DD
    fullDayBlocked:  { type: Boolean, default: false },
    blockedSlots:    [{ type: String }],
  },
  { timestamps: true }
);

// Compound unique: one doc per (doctor, date)
DoctorAvailabilitySchema.index({ doctorId: 1, date: 1 }, { unique: true });

export default mongoose.model<IDoctorAvailability>('DoctorAvailability', DoctorAvailabilitySchema);
