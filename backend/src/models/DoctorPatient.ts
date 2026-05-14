import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctorPatient extends Document {
  doctorId: string;
  patientId: string;
  addedAt: Date;
}

const DoctorPatientSchema: Schema = new Schema({
  doctorId: { type: String, required: true },
  patientId: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
});

DoctorPatientSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });

export default mongoose.model<IDoctorPatient>('DoctorPatient', DoctorPatientSchema);
