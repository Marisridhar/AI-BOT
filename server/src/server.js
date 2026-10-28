import app from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

let server;

async function startServer() {
  try {
    // Attempt database connection
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn(`[Server] Warning: MongoDB connection failed on startup (${dbErr.message}). Server running in degraded mode.`);
    }

    server = app.listen(env.PORT, () => {
      console.log('==================================================');
      console.log(`🚀 AI Bot Backend Server running on port ${env.PORT}`);
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(`📡 Health Check: http://localhost:${env.PORT}/api/health`);
      console.log(`🤖 Gemini Model: ${env.GEMINI_MODEL} (${env.isGeminiConfigured() ? 'Configured' : 'Missing Key'})`);
      console.log(`✉️  Email Delivery: ${env.isEmailConfigured() ? 'Configured' : 'Not Configured'}`);
      console.log(`🔑 Admin Key: ${env.isAdminConfigured() ? 'Configured' : 'Missing'}`);
      console.log('==================================================');
    });
  } catch (err) {
    console.error(`[Server] Fatal startup error: ${err.message}`);
    process.exit(1);
  }
}

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export { server };

