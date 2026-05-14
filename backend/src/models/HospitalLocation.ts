import mongoose, { Schema, Document } from 'mongoose';

export interface IHospitalLocation extends Document {
  hospitalName: string;
  address: string;
  lat: number;
  lng: number;
  updatedByDoctorId: string;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalLocationSchema: Schema = new Schema(
  {
    hospitalName:      { type: String, required: true, unique: true },
    address:           { type: String, required: true },
    lat:               { type: Number, required: true },
    lng:               { type: Number, required: true },
    updatedByDoctorId: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IHospitalLocation>('HospitalLocation', HospitalLocationSchema);
