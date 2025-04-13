import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env');
}

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    // Already connected
    return mongoose.connection;
  }
  try {
    const db = await mongoose.connect(MONGODB_URI as string, {
      bufferCommands: false,
    });
    console.log('MongoDB connected');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
