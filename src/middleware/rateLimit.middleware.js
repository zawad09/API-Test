/**
 * Rate limiters (express-rate-limit).
 *
 * - apiLimiter:  general protection for every /api route.
 * - authLimiter: stricter limit on /api/auth to slow down brute-force
 *                login/register attempts.
 *
 * Both are disabled automatically when NODE_ENV=test so the automated test
 * suite (which sends many requests in a few seconds) is never throttled.
 */
const { rateLimit } = require('express-rate-limit');

const jsonMessage = (message) => ({
  success: false,
  message,
  errors: [],
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // max 300 requests per window per IP
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  message: jsonMessage('Too many requests from this IP. Please try again later.'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50, // max 50 auth attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many authentication attempts. Please try again later.'),
});

const isTestEnv = process.env.NODE_ENV === 'test';
const passthrough = (req, res, next) => next();

module.exports = {
  apiLimiter: isTestEnv ? passthrough : apiLimiter,
  authLimiter: isTestEnv ? passthrough : authLimiter,
};
