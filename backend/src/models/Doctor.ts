import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctor extends Document {
  doctorId: string;
  name: string;
  email: string;
  passwordHash: string;
  contactNumber: string;

  // Profile setup fields (filled on first login)
  isProfileCompleted: boolean;
  specialization?: string;
  hospital?: string;
  qualification?: string;
  designation?: string;
  experience?: number;
  gender?: string;

  // Hospital membership fields (doctor-hospital onboarding)
  hospitalId?: string | null;
  role?: 'ADMIN' | 'DOCTOR' | null;

  blockedDates: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema: Schema = new Schema(
  {
    doctorId:      { type: String, required: true, unique: true },
    name:          { type: String, required: true },
    email:         { type: String, required: true, unique: true },
    passwordHash:  { type: String, required: true },
    contactNumber: { type: String, required: true },

    isProfileCompleted: { type: Boolean, default: false },
    specialization: { type: String, default: '' },
    hospital:       { type: String, default: '' },
    qualification:  { type: String, default: '' },
    designation:    { type: String, default: '' },
    experience:     { type: Number, default: 0 },
    gender:         { type: String, default: '' },

    hospitalId: { type: String, default: null, index: true },
    role:       { type: String, enum: ['ADMIN', 'DOCTOR', null], default: null },

    blockedDates: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IDoctor>('Doctor', DoctorSchema);
