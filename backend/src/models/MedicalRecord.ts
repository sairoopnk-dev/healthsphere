import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicalRecord extends Document {
  patientId: string;
  doctorId?: string;
  doctorName?: string;
  hospitalName?: string;
  appointmentId?: string;
  type: 'consultation' | 'prescription' | 'lab_report' | 'xray' | 'vaccination';
  recordType: 'prescription' | 'report';
  title: string;
  description: string;
  diagnosis?: string;
  medicines?: {
    name: string;
    type: 'tablet' | 'injection' | 'syrup' | 'capsule' | 'drops' | 'ointment' | 'other';
    dosage?: string;
    frequency?: string;
    duration?: string;
  }[];
  documents?: {
    type: 'prescription' | 'xray' | 'blood_report' | 'other';
    fileUrl: string;
    label?: string;
    uploadedAt: Date;
  }[];
  date: Date;
  attachments?: string[];
  aiSummary: string | null;
  summaryGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalRecordSchema: Schema = new Schema({
  patientId:    { type: String, required: true },
  doctorId:     { type: String },
  doctorName:   { type: String },
  hospitalName: { type: String },
  appointmentId:{ type: String, default: null },
  type:       { type: String, required: true, enum: ['consultation', 'prescription', 'lab_report', 'xray', 'vaccination'] },
  recordType: { type: String, required: true, enum: ['prescription', 'report'], default: 'report' },
  title:      { type: String, required: true },
  description:{ type: String, default: '' },
  diagnosis:  { type: String },
  medicines: [{
    name:      { type: String },
    type:      { type: String, enum: ['tablet', 'injection', 'syrup', 'capsule', 'drops', 'ointment', 'other'], default: 'tablet' },
    dosage:    { type: String },
    frequency: { type: String },
    duration:  { type: String },
  }],
  documents: [{
    type:       { type: String, enum: ['prescription', 'xray', 'blood_report', 'other'], default: 'other' },
    fileUrl:    { type: String },
    label:      { type: String },
    uploadedAt: { type: Date, default: Date.now },
  }],
  date:       { type: Date, required: true, default: Date.now },
  attachments:[{ type: String }],
  aiSummary:  { type: String, default: null },
  summaryGeneratedAt: { type: Date, default: null },
}, { timestamps: true });

MedicalRecordSchema.index({ patientId: 1, recordType: 1, date: -1 });
MedicalRecordSchema.index({ appointmentId: 1 }, { unique: true, sparse: true });

export default mongoose.model<IMedicalRecord>('MedicalRecord', MedicalRecordSchema);
