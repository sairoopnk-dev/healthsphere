import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicine {
  _id?: any;
  medicineName: string;
  type: 'tablet' | 'syrup' | 'capsule' | 'injection' | 'drops' | 'ointment' | 'other';
  dosage: string;
  frequency: string;
  instructions: string;
  durationDays: number;      // e.g. 7
  prescribedDate: Date;
  endDate: Date;             // prescribedDate + durationDays
  status: 'active' | 'completed';
}

export interface IPrescription extends Document {
  patientId: string;
  doctorId: string;
  doctorName: string;
  prescriptionTitle: string; // e.g. "Post-op Care"
  medicines: IMedicine[];
  notes?: string;
  prescribedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema = new Schema<IMedicine>(
  {
    medicineName:   { type: String, required: true },
    type:           { type: String, enum: ['tablet','syrup','capsule','injection','drops','ointment','other'], default: 'tablet' },
    dosage:         { type: String, required: true },
    frequency:      { type: String, required: true },
    instructions:   { type: String, default: '' },
    durationDays:   { type: Number, required: true, min: 1 },
    prescribedDate: { type: Date,   required: true },
    endDate:        { type: Date,   required: true },
    status:         { type: String, enum: ['active','completed'], default: 'active' },
  },
  { _id: true }
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    patientId:          { type: String, required: true },
    doctorId:           { type: String, required: true },
    doctorName:         { type: String, required: true },
    prescriptionTitle:  { type: String, required: true },
    medicines:          [MedicineSchema],
    notes:              { type: String, default: '' },
    prescribedDate:     { type: Date,   default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
