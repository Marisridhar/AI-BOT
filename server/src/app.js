import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import env from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import studentRoutes from './routes/student.routes.js';
import mentorRoutes from './routes/mentor.routes.js';

// Retain legacy routes for full backward compatibility
import assignmentRoutes from './routes/assignment.routes.js';
import taskRoutes from './routes/task.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import reviewRoutes from './routes/review.routes.js';

import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-api-key']
  })
);

// Cookie parser
app.use(cookieParser());

// Rate limiting (generous for test/dev, protective in production)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  }
});
app.use('/api', limiter);

// Request parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Serve static frontend files from public/ directory
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

// Mount REST API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student/mentor', mentorRoutes);
app.use('/api/student', studentRoutes);

// Legacy routes for backward compatibility with initial tests
app.use('/api/admin/assignments', assignmentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin/submissions', submissionRoutes);
app.use('/api/admin/reviews', reviewRoutes);

// Catch-all for undefined routes
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

export default app;
