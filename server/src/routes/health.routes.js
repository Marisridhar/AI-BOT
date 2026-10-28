import { Router } from 'express';
import { checkDBHealth } from '../config/db.js';
import env from '../config/env.js';

const router = Router();

router.get('/', (req, res) => {
  const dbHealth = checkDBHealth();

  const isGeminiReady = env.isGeminiConfigured();
  const isEmailReady = env.isEmailConfigured();
  const isAdminReady = env.isAdminConfigured();

  const isHealthy = dbHealth.status === 'up';

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        gemini: {
          configured: isGeminiReady,
          model: env.GEMINI_MODEL
        },
        email: {
          configured: isEmailReady
        },
        admin: {
          configured: isAdminReady
        }
      }
    }
  });
});

export default router;

