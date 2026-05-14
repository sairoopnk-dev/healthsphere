import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MedicalRecord from './src/models/MedicalRecord';

dotenv.config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const result = await MedicalRecord.deleteMany({ type: 'consultation', title: /Appointment/ });
    console.log(`Deleted ${result.deletedCount} consultation records.`);
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}

cleanup();
