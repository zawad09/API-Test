/**
 * Recommendations controller - reads the saved recommendations of one
 * analysis. Ownership is enforced inside recommendation.service.
 */
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const recommendationService = require('../services/recommendation.service');

/** GET /api/recommendations/:analysisId (owner only) */
const getRecommendations = asyncHandler(async (req, res) => {
  const result = await recommendationService.getRecommendationsForAnalysis(
    req.user._id,
    req.params.analysisId
  );
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Recommendations retrieved successfully',
    data: result,
  });
});

module.exports = { getRecommendations };
