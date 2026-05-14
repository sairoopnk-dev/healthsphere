import mongoose, { Schema, Document } from 'mongoose';

export interface IHospital extends Document {
  hospitalId: string;      // "HOSP-NNNNN"
  name: string;
  latitude: number;        // -90..90
  longitude: number;       // -180..180
  address: string;
  createdBy: string;       // Doctor_ID of creator (e.g. "DOC-12345")
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema: Schema = new Schema(
  {
    hospitalId: { type: String, required: true, unique: true, index: true },
    name:       { type: String, required: true },
    latitude:   { type: Number, required: true, min: -90, max: 90 },
    longitude:  { type: Number, required: true, min: -180, max: 180 },
    address:    { type: String, required: true },
    createdBy:  { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IHospital>('Hospital', HospitalSchema);
