/**
 * Jobs controller - public endpoints (no authentication needed).
 */
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const jobService = require('../services/job.service');

/** GET /api/jobs?category=&experienceLevel= - active jobs only */
const listJobs = asyncHandler(async (req, res) => {
  const jobs = await jobService.getActiveJobs(req.query);
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Active jobs retrieved successfully',
    data: { count: jobs.length, jobs },
  });
});

/** GET /api/jobs/:id */
const getJob = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.params.id);
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Job retrieved successfully',
    data: { job },
  });
});

module.exports = { listJobs, getJob };
