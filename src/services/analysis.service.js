/**
 * Skill-gap analysis engine - THE core feature of SkillBridge AI.
 *
 * Fully deterministic: same inputs always produce the same output, no
 * external AI service involved. The pure function `analyzeSkillGap` is easy
 * to unit test; `runAnalysis` wires it to the database and saves the result.
 *
 * ------------------------------------------------------------------
 * Scoring model
 * ------------------------------------------------------------------
 * Level values:   beginner = 1, intermediate = 2, advanced = 3
 * Importance:     low = 1, medium = 2, high = 3
 *
 * For every required skill:
 *   maxScore    = importance weight x required level
 *   earnedScore = importance weight x min(user level, required level)
 *                 (0 if the user does not have the skill)
 *
 *   overallMatchPercentage = (totalEarned / totalMax) x 100, rounded to 2
 *   decimals and capped at 100. Jobs with no required skills safely score 0
 *   instead of dividing by zero.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');
const Analysis = require('../models/Analysis');
const ApiError = require('../utils/ApiError');
const { generateRecommendations } = require('./recommendation.service');

const LEVEL_SCORES = { beginner: 1, intermediate: 2, advanced: 3 };
const IMPORTANCE_WEIGHTS = { low: 1, medium: 2, high: 3 };

/** Trim, collapse inner whitespace and lowercase for fair comparison. */
const normalizeSkillName = (name) => String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const levelValue = (level) => LEVEL_SCORES[level] ?? 1;

/**
 * Pure skill-gap calculation (no database access).
 *
 * @param {Array<{skillName: string, proficiencyLevel: string}>} userSkills
 * @param {Array<{skillName: string, requiredLevel: string, importance: string}>} requiredSkills
 * @returns {{matchedSkills: object[], missingSkills: object[], improvementSkills: object[], overallMatchPercentage: number}}
 */
function analyzeSkillGap(userSkills = [], requiredSkills = []) {
  // Index the user's skills by normalized name.
  // If the input contains duplicates, keep the HIGHEST level the user claims.
  const userSkillIndex = new Map();
  for (const skill of userSkills) {
    const key = normalizeSkillName(skill?.skillName);
    if (!key) continue;
    const value = levelValue(skill.proficiencyLevel);
    const existing = userSkillIndex.get(key);
    if (!existing || value > existing.value) {
      userSkillIndex.set(key, { value, label: skill.proficiencyLevel });
    }
  }

  const matchedSkills = [];
  const missingSkills = [];
  const improvementSkills = [];
  let totalMaxScore = 0;
  let totalEarnedScore = 0;

  for (const required of requiredSkills) {
    const skillName = String(required?.skillName ?? '').trim();
    if (!skillName) continue; // ignore malformed entries safely

    const requiredLevel = required.requiredLevel;
    const importance = required.importance;
    const weight = IMPORTANCE_WEIGHTS[importance] ?? 1;
    const reqValue = levelValue(requiredLevel);
    const maxScore = weight * reqValue;
    totalMaxScore += maxScore;

    const userSkill = userSkillIndex.get(normalizeSkillName(skillName));

    if (!userSkill) {
      // MISSING: user does not have this skill at all -> earned score 0.
      missingSkills.push({ skillName, requiredLevel, importance });
      continue;
    }

    if (userSkill.value >= reqValue) {
      // MATCHED: user level >= required level. Score is capped at maxScore
      // so over-qualified skills never inflate the percentage beyond 100.
      matchedSkills.push({
        skillName, // use the job's spelling as the canonical display name
        requiredLevel,
        userLevel: userSkill.label,
        importance,
      });
      totalEarnedScore += maxScore;
    } else {
      // NEEDS IMPROVEMENT: user has the skill but below the required level.
      totalEarnedScore += weight * userSkill.value;
      improvementSkills.push({
        skillName,
        currentLevel: userSkill.label,
        requiredLevel,
        importance,
        levelGap: reqValue - userSkill.value,
      });
    }
  }

  const overallMatchPercentage =
    totalMaxScore === 0
      ? 0 // no requirements -> no gap -> safely 0 instead of division by zero
      : Math.min(100, Math.round((totalEarnedScore / totalMaxScore) * 10000) / 100);

  return { matchedSkills, missingSkills, improvementSkills, overallMatchPercentage };
}

/**
 * Full workflow: load user + job, analyze, generate recommendations,
 * persist a new Analysis document and return everything the API needs.
 *
 * @param {string} userId - from the authenticated request
 * @param {string} jobId - from the URL parameter
 */
const runAnalysis = async (userId, jobId) => {
  if (!mongoose.isValidObjectId(jobId)) {
    throw ApiError.badRequest('Invalid jobId format');
  }

  const [user, job] = await Promise.all([
    User.findById(userId).select('name currentSkills'),
    Job.findById(jobId),
  ]);

  if (!user) throw ApiError.notFound('User not found');
  if (!job) throw ApiError.notFound('Job not found. Pick a job from GET /api/jobs first.');

  const result = analyzeSkillGap(user.currentSkills ?? [], job.requiredSkills ?? []);
  const recommendations = generateRecommendations({
    missingSkills: result.missingSkills,
    improvementSkills: result.improvementSkills,
    jobTitle: job.title,
  });

  const analysis = await Analysis.create({
    user: userId,
    job: jobId,
    overallMatchPercentage: result.overallMatchPercentage,
    matchedSkills: result.matchedSkills,
    missingSkills: result.missingSkills,
    improvementSkills: result.improvementSkills,
    recommendations,
  });

  return { analysis, job };
};

/**
 * One saved analysis by id - with ownership check:
 * a user may only read their OWN analyses.
 */
const getAnalysisById = async (userId, analysisId) => {
  if (!mongoose.isValidObjectId(analysisId)) {
    throw ApiError.badRequest('Invalid analysis id format');
  }

  const analysis = await Analysis.findById(analysisId).populate(
    'job',
    'title company category experienceLevel'
  );

  if (!analysis) throw ApiError.notFound('Analysis not found');
  if (String(analysis.user) !== String(userId)) {
    throw ApiError.forbidden('You do not have permission to access this analysis.');
  }

  return analysis;
};

/** All analyses of the authenticated user, newest first. */
const getAnalysisHistory = async (userId) =>
  Analysis.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate('job', 'title company category experienceLevel')
    .select('-recommendations -__v'); // recommendations live behind their own endpoint

module.exports = { analyzeSkillGap, runAnalysis, getAnalysisById, getAnalysisHistory };
