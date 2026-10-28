import { AppError } from '../utils/AppError.js';
import env from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('; ');
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID_FORMAT';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle Mongo duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate entry for ${field || 'field'}`;
  }

  // Handle SyntaxError (JSON body parsing)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON_BODY';
    message = 'Invalid JSON in request payload';
  }

  // Do not expose stack trace or internal error messages in production
  if (!env.isProduction && statusCode === 500) {
    console.error('[Error Trace]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {})
    }
  });
};

export default errorHandler;

