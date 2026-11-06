/**
 * User profile controller.
 * The profile always belongs to req.user - there is no way to request
 * another user's profile, so cross-user access is impossible by design.
 */
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/user.service');

/** GET /api/users/profile */
const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user._id);
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Profile retrieved successfully',
    data: { user },
  });
});

/** PUT /api/users/profile - partial update of profile + skills */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Profile updated successfully',
    data: { user },
  });
});

module.exports = { getProfile, updateProfile };
