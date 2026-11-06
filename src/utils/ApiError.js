/**
 * Custom application error class.
 *
 * Every service throws an ApiError when something goes wrong (bad input,
 * missing resource, permission problem...). The central error middleware
 * (src/middleware/error.middleware.js) catches it and converts it into the
 * consistent JSON error response:
 *
 *   { "success": false, "message": "...", "errors": [] }
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 409, 500...)
   * @param {string} message - Human-readable error message.
   * @param {Array<{field: string, message: string}>} errors - Optional field-level details.
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // "expected" errors (vs programming bugs)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Small factory helpers so services read like sentences.
  static badRequest(message = 'Bad request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource conflict') {
    return new ApiError(409, message);
  }
}

module.exports = ApiError;
