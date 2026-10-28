import mongoose from 'mongoose';
import env from './env.js';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      autoIndex: true
    });
    isConnected = true;
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`);
    throw error;
  }
};

export const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB disconnected');
  }
};

export const checkDBHealth = () => {
  const state = mongoose.connection.readyState;
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return {
    status: state === 1 ? 'up' : 'down',
    state: stateMap[state] || 'unknown'
  };
};

export default connectDB;

