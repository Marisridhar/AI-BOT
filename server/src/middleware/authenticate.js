import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const authenticate = async (req, res, next) => {
  try {
    // 1. Support x-admin-api-key for backward compatibility and admin operations
    const adminKey = req.headers['x-admin-api-key'];
    if (adminKey && env.isAdminConfigured() && adminKey.trim() === env.ADMIN_API_KEY.trim()) {
      req.user = {
        _id: 'admin_master',
        id: 'admin_master',
        name: 'Administrator',
        email: 'admin@aibot.local',
        role: 'admin'
      };
      return next();
    }

    // 2. Extract JWT token from Authorization header or cookie
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return next(new AppError('Invalid or expired authentication token', 401, 'INVALID_TOKEN'));
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status === 'disabled') {
      return next(new AppError('User not found or account disabled', 401, 'UNAUTHORIZED'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export default authenticate;

