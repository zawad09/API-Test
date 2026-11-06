/**
 * Analysis controller.
 * runAnalysis returns the saved document plus the job - the controller maps
 * both into the flat "data" object documented in the OpenAPI spec.
 */
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const analysisService = require('../services/analysis.service');

/** Shape an Analysis document + its job into the documented flat response. */
const toAnalysisPayload = (analysis, job) => ({
  analysisId: analysis._id,
  jobId: job?._id ?? analysis.job,
  jobTitle: job?.title ?? analysis.job?.title,
  company: job?.company ?? analysis.job?.company,
  category: job?.category ?? analysis.job?.category,
  experienceLevel: job?.experienceLevel ?? analysis.job?.experienceLevel,
  overallMatchPercentage: analysis.overallMatchPercentage,
  matchedSkills: analysis.matchedSkills,
  missingSkills: analysis.missingSkills,
  improvementSkills: analysis.improvementSkills,
  recommendations: analysis.recommendations,
  createdAt: analysis.createdAt,
});

/** POST /api/analysis/:jobId - run + save a new analysis (201) */
const createAnalysis = asyncHandler(async (req, res) => {
  const { analysis, job } = await analysisService.runAnalysis(req.user._id, req.params.jobId);
  return ApiResponse.success(res, {
    statusCode: 201,
    message: 'Skill analysis completed successfully',
    data: toAnalysisPayload(analysis, job),
  });
});

/** GET /api/analysis/history - the authenticated user's analyses, newest first */
const getHistory = asyncHandler(async (req, res) => {
  const analyses = await analysisService.getAnalysisHistory(req.user._id);
  const data = analyses.map((a) => ({
    analysisId: a._id,
    jobId: a.job?._id ?? a.job,
    jobTitle: a.job?.title,
    company: a.job?.company,
    category: a.job?.category,
    experienceLevel: a.job?.experienceLevel,
    overallMatchPercentage: a.overallMatchPercentage,
    matchedSkills: a.matchedSkills,
    missingSkills: a.missingSkills,
    improvementSkills: a.improvementSkills,
    createdAt: a.createdAt,
  }));
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Analysis history retrieved successfully',
    data: { count: data.length, analyses: data },
  });
});

/** GET /api/analysis/:id - one analysis (owner only) */
const getAnalysis = asyncHandler(async (req, res) => {
  const analysis = await analysisService.getAnalysisById(req.user._id, req.params.id);
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Analysis retrieved successfully',
    data: toAnalysisPayload(analysis, analysis.job),
  });
});

module.exports = { createAnalysis, getHistory, getAnalysis };
