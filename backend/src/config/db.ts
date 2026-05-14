import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }

    console.log(`Attempting to connect to MongoDB at ${uri} ...`);
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Fatal DB error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

export default connectDB;
