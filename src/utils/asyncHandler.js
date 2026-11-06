/**
 * Wraps an async route handler so any rejected promise is forwarded to the
 * central error middleware via next(error).
 *
 * Without this, an exception inside "async (req, res) => {...}" would never
 * reach Express 4's error handler and the request would hang forever.
 *
 * Usage:  router.get('/', asyncHandler(controller.something))
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
