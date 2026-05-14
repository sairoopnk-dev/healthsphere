import mongoose, { Schema, Document } from 'mongoose';

export interface IReportSnapshot {
  title: string;
  summary: string;
  date: Date;
}

export interface IMedicalContext extends Document {
  userId: string;
  conditions: string[];
  medications: string[];
  allergies: string[];
  reports: IReportSnapshot[];
  dietPreferences: string[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSnapshotSchema = new Schema<IReportSnapshot>(
  {
    title:   { type: String, required: true },
    summary: { type: String, required: true, maxlength: 500 },
    date:    { type: Date, default: Date.now },
  },
  { _id: false },
);

const MedicalContextSchema = new Schema<IMedicalContext>(
  {
    userId:          { type: String, required: true, unique: true },
    conditions:      [{ type: String }],
    medications:     [{ type: String }],
    allergies:       [{ type: String }],
    reports:         { type: [ReportSnapshotSchema], default: [] },
    dietPreferences: [{ type: String }],
    lastUpdated:     { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model<IMedicalContext>('MedicalContext', MedicalContextSchema);
