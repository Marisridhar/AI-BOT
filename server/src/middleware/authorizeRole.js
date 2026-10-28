import { AppError } from '../utils/AppError.js';

export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Access requires one of the following roles: ${allowedRoles.join(', ')}`,
          403,
          'FORBIDDEN'
        )
      );
    }
    next();
  };
};

export default authorizeRole;

