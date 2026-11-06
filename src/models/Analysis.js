/**
 * Analysis model - the saved result of one skill-gap analysis.
 *
 * Every analysis belongs to exactly ONE user and ONE job (ObjectId refs).
 * The arrays are filled by the deterministic analysis engine in
 * src/services/analysis.service.js - nothing here is guessed at runtime.
 */
const mongoose = require('mongoose');

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];
const IMPORTANCE_LEVELS = ['low', 'medium', 'high'];

/** User has the skill at (or above) the required level. */
const matchedSkillSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true },
    requiredLevel: { type: String, required: true, enum: SKILL_LEVELS },
    userLevel: { type: String, required: true, enum: SKILL_LEVELS },
    importance: { type: String, required: true, enum: IMPORTANCE_LEVELS },
  },
  { _id: false }
);

/** User does not have the skill at all. */
const missingSkillSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true },
    requiredLevel: { type: String, required: true, enum: SKILL_LEVELS },
    importance: { type: String, required: true, enum: IMPORTANCE_LEVELS },
  },
  { _id: false }
);

/** User has the skill but below the required level. */
const improvementSkillSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true },
    currentLevel: { type: String, required: true, enum: SKILL_LEVELS },
    requiredLevel: { type: String, required: true, enum: SKILL_LEVELS },
    importance: { type: String, required: true, enum: IMPORTANCE_LEVELS },
    levelGap: { type: Number, required: true, min: 1, max: 2 },
  },
  { _id: false }
);

/** Deterministic learning suggestion generated from the gap. */
const recommendationSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true },
    currentLevel: { type: String, enum: SKILL_LEVELS, default: null },
    targetLevel: { type: String, required: true, enum: SKILL_LEVELS },
    priority: { type: String, required: true, enum: IMPORTANCE_LEVELS },
    reason: { type: String, required: true },
    suggestedAction: { type: String, required: true },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Analysis must belong to a user'],
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Analysis must reference a job'],
      index: true,
    },
    overallMatchPercentage: { type: Number, required: true, min: 0, max: 100 },
    matchedSkills: { type: [matchedSkillSchema], default: [] },
    missingSkills: { type: [missingSkillSchema], default: [] },
    improvementSkills: { type: [improvementSkillSchema], default: [] },
    recommendations: { type: [recommendationSchema], default: [] },
  },
  { timestamps: true } // createdAt is when the analysis was run
);

const Analysis = mongoose.model('Analysis', analysisSchema);

module.exports = Analysis;
