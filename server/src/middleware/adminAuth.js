import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const adminAuth = (req, res, next) => {
  if (!env.isAdminConfigured()) {
    return next(new AppError('Administrator API key is not configured on the server', 403, 'ADMIN_NOT_CONFIGURED'));
  }

  const clientKey = req.headers['x-admin-api-key'];
  if (!clientKey || clientKey.trim() !== env.ADMIN_API_KEY.trim()) {
    return next(new AppError('Unauthorized: Invalid or missing administrator API key', 401, 'UNAUTHORIZED'));
  }

  next();
};

export default adminAuth;

