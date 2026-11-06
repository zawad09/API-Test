/**
 * JWT authentication middleware ("protect").
 *
 * Expects an Authorization header:  "Bearer <token>"
 * On success it attaches the fresh user document to req.user, so every
 * protected controller can safely use req.user._id.
 *
 * Security notes:
 * - The user is re-fetched from the database on every request, so a token for
 *   a deleted user stops working immediately.
 * - The password field is never selected (see User model).
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required. Provide a valid Bearer token in the Authorization header.');
  }

  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token. Please log in again.');
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    throw ApiError.unauthorized('The user belonging to this token no longer exists.');
  }

  req.user = user;
  return next();
});

module.exports = { protect };
