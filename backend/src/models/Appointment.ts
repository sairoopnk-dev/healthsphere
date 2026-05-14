import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  appointmentId: string;
  patientId:    string;
  patientName:  string;
  doctorId:     string;
  doctorName:   string;
  hospital:     string;
  date:         string;    // YYYY-MM-DD
  timeSlot:     string;    // e.g. "09:00 AM"
  status:       'scheduled' | 'completed' | 'cancelled';
  diagnosis?:   string;    // filled by doctor after visit
  reportUrl?:   string;    // URL to report PDF/image if any
  severityScore?: number;  // 1–10, from AI symptom checker
  isPriority?:  boolean;   // doctor can pin to top
  createdAt:    Date;
}

const AppointmentSchema: Schema = new Schema({
  appointmentId: { type: String, required: true, unique: true },
  patientId:     { type: String, required: true, index: true },
  patientName:   { type: String, required: true },
  doctorId:      { type: String, required: true },
  doctorName:    { type: String, required: true },
  hospital:      { type: String, required: true },
  date:          { type: String, required: true },   // YYYY-MM-DD
  timeSlot:      { type: String, required: true },   // "HH:MM AM/PM"
  status:        { type: String, default: 'scheduled', enum: ['scheduled','completed','cancelled'] },
  diagnosis:     { type: String, default: '' },      // doctor fills after visit
  reportUrl:     { type: String, default: '' },      // optional report file URL
  severityScore: { type: Number, default: null },
  isPriority:    { type: Boolean, default: false },
}, { timestamps: true });

// Compound index: fast chronological sort per patient
AppointmentSchema.index({ patientId: 1, date: 1, timeSlot: 1 });

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);
