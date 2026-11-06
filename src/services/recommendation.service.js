/**
 * Recommendation service.
 *
 * Deterministic rule-based engine (no LLM in Phase 02 - that is a documented
 * future enhancement). Rules:
 *   1. Missing HIGH-importance skills get the highest priority.
 *   2. Priorities follow the skill importance (high > medium > low).
 *   3. Within the same priority, missing skills come before improvement
 *      skills (starting from zero is more urgent than leveling up).
 *   4. Every suggestion is practical and self-contained - no invented
 *      course names or external links.
 */
const Analysis = require('../models/Analysis');
const ApiError = require('../utils/ApiError');

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/** Suggested action when the skill is completely missing. */
const missingActionByTargetLevel = {
  beginner: (skill) =>
    `Start with the fundamentals of ${skill}: follow a beginner-friendly tutorial or an official getting-started guide, then apply the basics in one small hands-on project.`,
  intermediate: (skill) =>
    `Build working knowledge of ${skill}: study a structured course or the official documentation, then practice by using ${skill} in a small but realistic project.`,
  advanced: (skill) =>
    `Plan a focused deep dive into ${skill}: study official documentation and best practices, then build an advanced project that demonstrates production-level use of ${skill}.`,
};

/** Suggested action when the user must climb 1 or 2 proficiency levels. */
const improvementActionByGap = {
  1: (skill) =>
    `Strengthen your ${skill} fundamentals with targeted exercises, then take on a slightly bigger project to move up one proficiency level.`,
  2: (skill) =>
    `Rebuild your ${skill} basics and follow a guided intermediate path so you can close the two-level gap step by step.`,
};

/**
 * Generate prioritized recommendations from the analysis result.
 * Output shape per item: { skillName, currentLevel, targetLevel, priority, reason, suggestedAction }
 *
 * @param {{missingSkills: object[], improvementSkills: object[], jobTitle: string}} input
 */
function generateRecommendations({ missingSkills = [], improvementSkills = [], jobTitle = 'target role' }) {
  const recommendations = [];

  for (const skill of missingSkills) {
    recommendations.push({
      skillName: skill.skillName,
      currentLevel: null,
      targetLevel: skill.requiredLevel,
      priority: skill.importance,
      reason: `${skill.skillName} is required at ${skill.requiredLevel} level for the ${jobTitle} role, but it is missing from your current skill set.`,
      suggestedAction:
        missingActionByTargetLevel[skill.requiredLevel]?.(skill.skillName) ??
        `Start learning ${skill.skillName} from the fundamentals and build a small project with it.`,
    });
  }

  for (const skill of improvementSkills) {
    recommendations.push({
      skillName: skill.skillName,
      currentLevel: skill.currentLevel,
      targetLevel: skill.requiredLevel,
      priority: skill.importance,
      reason: `You know ${skill.skillName} at ${skill.currentLevel} level, but the ${jobTitle} role requires ${skill.requiredLevel} level proficiency.`,
      suggestedAction:
        improvementActionByGap[skill.levelGap]?.(skill.skillName) ??
        missingActionByTargetLevel[skill.requiredLevel]?.(skill.skillName) ??
        `Keep practicing ${skill.skillName} to reach ${skill.requiredLevel} level.`,
    });
  }

  // Priority first (high -> medium -> low); missing before improvement on ties.
  recommendations.sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    const aIsMissing = a.currentLevel === null ? 0 : 1;
    const bIsMissing = b.currentLevel === null ? 0 : 1;
    return aIsMissing - bIsMissing;
  });

  return recommendations;
}

/**
 * Retrieve the saved recommendations of one analysis - with the same
 * ownership check as the analysis endpoints (404 unknown / 403 not yours).
 */
const getRecommendationsForAnalysis = async (userId, analysisId) => {
  if (!/^[0-9a-fA-F]{24}$/.test(String(analysisId))) {
    throw ApiError.badRequest('Invalid analysisId format');
  }

  const analysis = await Analysis.findById(analysisId).populate('job', 'title');
  if (!analysis) throw ApiError.notFound('Analysis not found');
  if (String(analysis.user) !== String(userId)) {
    throw ApiError.forbidden('You do not have permission to access this analysis.');
  }

  return {
    analysisId: analysis._id,
    jobId: analysis.job?._id ?? analysis.job,
    jobTitle: analysis.job?.title,
    overallMatchPercentage: analysis.overallMatchPercentage,
    recommendations: analysis.recommendations,
  };
};

module.exports = { generateRecommendations, getRecommendationsForAnalysis };
