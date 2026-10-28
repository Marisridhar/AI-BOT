import { AppError } from '../utils/AppError.js';

export const validateRequest = (schema) => (req, res, next) => {
  try {
    if (schema.body && req.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query && req.query) {
      req.query = schema.query.parse(req.query);
    }
    if (schema.params && req.params) {
      req.params = schema.params.parse(req.params);
    }
    next();
  } catch (err) {
    if (err.errors) {
      const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return next(new AppError(`Validation error: ${messages}`, 400, 'VALIDATION_ERROR', err.errors));
    }
    next(err);
  }
};

export default validateRequest;

