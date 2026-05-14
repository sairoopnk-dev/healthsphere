import mongoose, { Schema, Document } from 'mongoose';

export type MoodTag = 'positive' | 'neutral' | 'negative';

export interface IDeluluMessage {
  role: 'user' | 'bot';
  content: string;
  moodTag?: MoodTag;
  timestamp: Date;
}

export interface IDeluluChat extends Document {
  userId: string;
  messages: IDeluluMessage[];
  wellnessScore: number; // 0-100
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeluluMessageSchema = new Schema<IDeluluMessage>(
  {
    role:      { type: String, enum: ['user', 'bot'], required: true },
    content:   { type: String, required: true, maxlength: 4000 },
    moodTag:   { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const DeluluChatSchema = new Schema<IDeluluChat>(
  {
    userId:        { type: String, required: true, index: true },
    messages:      { type: [DeluluMessageSchema], default: [] },
    wellnessScore: { type: Number, default: 70, min: 0, max: 100 },
    lastActive:    { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Fast lookup: single user → their chat
DeluluChatSchema.index({ userId: 1 });

export default mongoose.model<IDeluluChat>('DeluluChat', DeluluChatSchema);
