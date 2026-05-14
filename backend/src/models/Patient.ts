import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
  _id?: any;
  label: string;       // e.g. 'Home', 'Work', 'Parents House'
  fullAddress: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export interface IPatient extends Document {
  patientId: string;
  name: string;
  email: string;
  passwordHash: string;
  contactNumber: string;

  // Profile setup fields (filled on first login)
  isProfileCompleted: boolean;
  dob?: string;           // ISO date string e.g. "2000-05-15" — used to calc age
  gender?: string;
  height?: number;        // cm
  weight?: number;        // kg
  bloodGroup?: string;
  emergencyContact?: {
    name: string;
    phone: string;
  };

  // Optional extra info
  address?: string;
  profilePicture?: string;
  addresses?: IAddress[];

  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema: Schema = new Schema(
  {
    patientId:          { type: String, required: true, unique: true },
    name:               { type: String, required: true },
    email:              { type: String, required: true, unique: true },
    passwordHash:       { type: String, required: true },
    contactNumber:      { type: String, required: true },

    isProfileCompleted: { type: Boolean, default: false },
    dob:                { type: String, default: '' },
    gender:             { type: String, default: '' },
    height:             { type: Number, default: null },
    weight:             { type: Number, default: null },
    bloodGroup:         { type: String, default: '' },
    emergencyContact: {
      name:  { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    address: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    addresses: [
      {
        label:       { type: String, required: true },
        fullAddress: { type: String, required: true },
        lat:         { type: Number, required: true },
        lng:         { type: Number, required: true },
        isDefault:   { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IPatient>('Patient', PatientSchema);
