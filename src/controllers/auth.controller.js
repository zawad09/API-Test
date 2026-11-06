/**
 * Auth controller - thin HTTP layer over auth.service.
 * No business logic here: read request, call service, send response.
 */
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

/** POST /api/auth/register - 201 with user + token */
const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.registerUser(req.body);
  return ApiResponse.success(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: { user, token },
  });
});

/** POST /api/auth/login - 200 with user + token */
const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.loginUser(req.body);
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Login successful',
    data: { user, token },
  });
});

/** GET /api/auth/me - 200 with the authenticated user (from protect middleware) */
const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Authenticated user retrieved successfully',
    data: { user: req.user },
  });
});

module.exports = { register, login, getMe };
