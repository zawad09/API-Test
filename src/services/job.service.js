/**
 * Job service - listing and details.
 * Only ACTIVE jobs appear in the public list; a direct :id lookup still
 * works for any existing job (useful for admins/tests and harmless here).
 */
const Job = require('../models/Job');
const ApiError = require('../utils/ApiError');

/** Escape user input before building a RegExp from it. */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Get all active jobs.
 * @param {{category?: string, experienceLevel?: string}} filters optional filters from query string
 */
const getActiveJobs = async (filters = {}) => {
  const query = { isActive: true };

  if (filters.category) {
    // Case-insensitive exact category match: "backend development" finds "Backend Development".
    query.category = new RegExp(`^${escapeRegex(filters.category.trim())}$`, 'i');
  }
  if (filters.experienceLevel) {
    query.experienceLevel = filters.experienceLevel;
  }

  return Job.find(query).sort({ createdAt: -1 });
};

const getJobById = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound('Job not found');
  return job;
};

module.exports = { getActiveJobs, getJobById };
