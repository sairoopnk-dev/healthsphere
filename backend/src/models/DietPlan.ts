import mongoose, { Schema, Document } from 'mongoose';

export interface IDietPlan extends Document {
  patientId: string;
  preferences: {
    dietType: 'vegan' | 'vegetarian' | 'non-vegetarian';
    allergies: string;
    goal: 'weight-loss' | 'weight-gain' | 'maintenance' | '';
  };
  metrics: {
    bmi: number;
    dailyCalories: number;
  };
  generatedPlan: string;
  createdAt: Date;
  updatedAt: Date;
}

const DietPlanSchema: Schema = new Schema(
  {
    patientId:  { type: String, required: true, unique: true }, // one plan per patient (overwrite)
    preferences: {
      dietType:  { type: String, enum: ['vegan', 'vegetarian', 'non-vegetarian'], required: true },
      allergies: { type: String, default: '' },
      goal:      { type: String, default: '' },
    },
    metrics: {
      bmi:           { type: Number },
      dailyCalories: { type: Number },
    },
    generatedPlan: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IDietPlan>('DietPlan', DietPlanSchema);
