import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const port = parseInt(process.env.PORT || '5000', 10);
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ai_bot';
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const adminApiKey = process.env.ADMIN_API_KEY || '';
const frontendBaseUrl = process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5000';
const jwtSecret = process.env.JWT_SECRET || 'ai-bot-default-super-secret-jwt-key-32chars!';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

const emailUser = process.env.EMAIL_USER || process.env.EMAIL_APP || '';
const emailPass = process.env.EMAIL_PASS || '';
const emailHost = process.env.EMAIL_HOST || (emailUser.includes('@gmail.com') ? 'smtp.gmail.com' : '');
const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
const emailSecure = process.env.EMAIL_SECURE === 'true' || emailPort === 465;
const emailFrom = process.env.EMAIL_FROM || (emailUser ? `AI Bot <${emailUser}>` : 'AI Bot <noreply@aibot.local>');

export const env = {
  NODE_ENV: nodeEnv,
  PORT: port,
  MONGO_URI: mongoUri,
  MONGODB_URI: mongoUri,
  GEMINI_API_KEY: geminiApiKey,
  GEMINI_MODEL: geminiModel,
  ADMIN_API_KEY: adminApiKey,
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: jwtExpiresIn,
  FRONTEND_BASE_URL: frontendBaseUrl.replace(/\/+$/, ''),
  EMAIL_HOST: emailHost,
  EMAIL_PORT: emailPort,
  EMAIL_USER: emailUser,
  EMAIL_PASS: emailPass,
  EMAIL_FROM: emailFrom,
  EMAIL_SECURE: emailSecure,
  isProduction: nodeEnv === 'production',
  isEmailConfigured: () => Boolean(emailUser && emailPass && (emailHost || emailUser.includes('@gmail.com'))),
  isGeminiConfigured: () => Boolean(geminiApiKey && geminiApiKey.trim().length > 0),
  isAdminConfigured: () => Boolean(adminApiKey && adminApiKey.trim().length > 0)
};

export default env;

