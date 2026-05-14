import mongoose, { Schema, Document } from 'mongoose';

export type InsightConfidence = 'low' | 'medium' | 'high';
export type InsightCategory = 'symptom' | 'condition' | 'behavior' | 'risk';

export interface IUserInsight extends Document {
  userId: string;
  pattern: string;
  category: InsightCategory;
  count: number;
  confidence: InsightConfidence;
  firstDetected: Date;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserInsightSchema = new Schema<IUserInsight>(
  {
    userId:        { type: String, required: true, index: true },
    pattern:       { type: String, required: true },
    category:      {
      type: String,
      required: true,
      enum: ['symptom', 'condition', 'behavior', 'risk'],
    },
    count:         { type: Number, default: 1, min: 1 },
    confidence:    {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    firstDetected: { type: Date, default: Date.now },
    lastUpdated:   { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One insight per pattern per user
UserInsightSchema.index({ userId: 1, pattern: 1 }, { unique: true });
// Sort insights by count for quick retrieval
UserInsightSchema.index({ userId: 1, count: -1 });

export default mongoose.model<IUserInsight>('UserInsight', UserInsightSchema);
