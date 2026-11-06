/**
 * Auth service - registration and login business logic.
 * Controllers never touch bcrypt/jwt directly; they call these functions.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const SALT_ROUNDS = 10;

/** Create a signed JWT for a user. Secret + expiry come from environment variables. */
const generateToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

/**
 * Register a new user.
 * @returns {{ user: Document, token: string }} user document (password stripped by toJSON) + JWT
 */
const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists. Please log in instead.');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name: name.trim(), email: normalizedEmail, password: hashedPassword });

  return { user, token: generateToken(user) };
};

/**
 * Log in with email + password.
 * Uses the same message for "unknown email" and "wrong password" so
 * attackers cannot discover which emails are registered.
 */
const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  return { user, token: generateToken(user) };
};

module.exports = { registerUser, loginUser, generateToken };
