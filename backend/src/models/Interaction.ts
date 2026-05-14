import mongoose, { Schema, Document } from 'mongoose';

export interface IInteraction extends Document {
  userId: string;
  type: 'symptom_check' | 'diet_plan' | 'report_summary' | 'prescription' | 'appointment';
  userInput: string;
  aiResponse: string;
  metadata: {
    keywords: string[];
    severity?: number;
    conditions?: string[];
  };
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InteractionSchema = new Schema<IInteraction>(
  {
    userId:     { type: String, required: true, index: true },
    type:       {
      type: String,
      required: true,
      enum: ['symptom_check', 'diet_plan', 'report_summary', 'prescription', 'appointment'],
    },
    userInput:  { type: String, required: true },
    aiResponse: { type: String, required: true, maxlength: 2000 },
    metadata: {
      keywords:   [{ type: String }],
      severity:   { type: Number, default: null },
      conditions: [{ type: String }],
    },
    timestamp:  { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Fast queries: recent interactions per user, sorted by time
InteractionSchema.index({ userId: 1, timestamp: -1 });
// Count interactions per user efficiently
InteractionSchema.index({ userId: 1, type: 1 });

export default mongoose.model<IInteraction>('Interaction', InteractionSchema);
