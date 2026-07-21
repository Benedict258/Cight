import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGO_URL || 'mongodb://localhost:27017/cight';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    throw err;
  }
}

export default mongoose;
