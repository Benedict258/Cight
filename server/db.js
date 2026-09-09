import mongoose from 'mongoose';

// CRITICAL: fail fast, don't hang when MongoDB is not running
mongoose.set('bufferCommands', false);

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGO_URL || process.env.MONGODB_URI;

let isConnected = false;

export async function connectDB() {
  if (isConnected) return true;
  if (!MONGODB_URI) {
    console.warn('[AI Studio] No MONGODB_URL configured — using in-memory store fallback');
    return false;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log('[AI Studio] MongoDB connected successfully');
    return true;
  } catch (err) {
    console.warn('[AI Studio] MongoDB connection failed:', err.message);
    console.warn('[AI Studio] Using in-memory store fallback for active session');
    isConnected = false;
    return false;
  }
}

export function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export default mongoose;
