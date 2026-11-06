/**
 * Central error-handling middleware - the LAST middleware in the chain.
 *
 * Any error thrown inside routes/services (or forwarded with next(err))
 * ends up here exactly once and is converted into one consistent response:
 *
 *   { "success": false, "message": "...", "errors": [] }
 *
 * It recognizes the most common error types (Zod, Mongoose, JWT, malformed
 * JSON) and converts them into clean 4xx responses. Unknown errors become
 * 500 and - in production - never leak stack traces or internals.
 */
const ApiError = require('../utils/ApiError');

/** Map known third-party errors to ApiError. */
const convertToApiError = (err) => {
  // Zod errors (safety net - most validation already happens in middleware)
  if (err && err.name === 'ZodError') {
    return new ApiError(
      400,
      'Validation failed',
      err.issues.map((issue) => ({
        field: issue.path.join('.') || '_root',
        message: issue.message,
      }))
    );
  }

  // Malformed JSON request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return new ApiError(400, 'Invalid JSON request body');
  }

  // Invalid MongoDB ObjectId (most IDs are pre-validated with Zod too)
  if (err.name === 'CastError') {
    return new ApiError(400, `Invalid ID format for field "${err.path}"`);
  }

  // Duplicate unique key (e.g. email already registered)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return new ApiError(409, `A record with this ${field} already exists`);
  }

  // Mongoose schema validation
  if (err.name === 'ValidationError' && err.errors) {
    return new ApiError(
      400,
      'Validation failed',
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  }

  // JWT problems
  if (err.name === 'JsonWebTokenError') {
    return new ApiError(401, 'Invalid token. Please log in again.');
  }
  if (err.name === 'TokenExpiredError') {
    return new ApiError(401, 'Your session has expired. Please log in again.');
  }

  return err;
};

// eslint-disable-next-line no-unused-vars - Express needs the 4-argument signature
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err); // response already started; delegate to default handler
  }

  const error = convertToApiError(err);
  const statusCode = error.statusCode || 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${error.message}`);
    if (process.env.NODE_ENV !== 'production') {
      console.error(error.stack);
    }
  }

  // In production, hide the details of unexpected server errors.
  const message =
    isServerError && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
  });
};

module.exports = errorHandler;
