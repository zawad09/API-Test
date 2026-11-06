/**
 * User service - profile retrieval and updates.
 * Profile is always derived from the authenticated user (req.user), so a
 * user can only ever read/modify their own profile by design.
 */
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const FIELDS_USER_MAY_UPDATE = ['education', 'university', 'careerGoal', 'experienceLevel', 'currentSkills'];

const getProfile = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

/**
 * Partial update: only provided fields are changed. Password/email cannot be
 * changed here (registration owns email; a password-change flow is future work).
 * Uses save() so the duplicate-skill validation hook runs again.
 */
const updateProfile = async (userId, updates) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  for (const field of FIELDS_USER_MAY_UPDATE) {
    if (updates[field] !== undefined) {
      user[field] = updates[field];
    }
  }

  await user.save();
  return user; // toJSON strips password
};

module.exports = { getProfile, updateProfile };
