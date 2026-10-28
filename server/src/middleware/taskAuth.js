import mongoose from 'mongoose';
import TaskRun from '../models/TaskRun.js';
import { AppError } from '../utils/AppError.js';

export const taskAuth = async (req, res, next) => {
  try {
    const { taskRunId } = req.params;

    if (!taskRunId || !mongoose.Types.ObjectId.isValid(taskRunId)) {
      return next(new AppError('Invalid taskRunId parameter', 400, 'INVALID_TASK_ID'));
    }

    // Extract token from Authorization: Bearer <token> or query ?token=<token>
    let rawToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.substring(7).trim();
    } else if (req.query.token) {
      rawToken = String(req.query.token).trim();
    }

    if (!rawToken) {
      return next(new AppError('Task access token is required (Bearer token or ?token=)', 401, 'TOKEN_REQUIRED'));
    }

    const taskRun = await TaskRun.findById(taskRunId).select('+taskAccessTokenHash');
    if (!taskRun) {
      return next(new AppError('Task not found', 404, 'TASK_NOT_FOUND'));
    }

    const computedHash = TaskRun.hashToken(rawToken);
    if (computedHash !== taskRun.taskAccessTokenHash) {
      return next(new AppError('Unauthorized: Invalid task access token', 401, 'INVALID_TOKEN'));
    }

    req.taskRun = taskRun;
    next();
  } catch (err) {
    next(err);
  }
};

export default taskAuth;

