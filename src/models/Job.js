/**
 * Job model - a (sample) job role with its required skills.
 *
 * Each required skill has:
 * - skillName:      e.g. "Node.js"
 * - requiredLevel:  beginner | intermediate | advanced
 * - importance:     low | medium | high  (drives the weighted score)
 *
 * The seeded records are demonstration profiles, NOT verified live vacancies.
 */
const mongoose = require('mongoose');

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];
const IMPORTANCE_LEVELS = ['low', 'medium', 'high'];

const requiredSkillSchema = new mongoose.Schema(
  {
    skillName: {
      type: String,
      required: [true, 'skillName is required for every required skill'],
      trim: true,
      minlength: 1,
      maxlength: 60,
    },
    requiredLevel: {
      type: String,
      required: [true, 'requiredLevel is required for every required skill'],
      enum: {
        values: SKILL_LEVELS,
        message: '{VALUE} is not a valid required level (beginner, intermediate or advanced)',
      },
    },
    importance: {
      type: String,
      required: [true, 'importance is required for every required skill'],
      enum: {
        values: IMPORTANCE_LEVELS,
        message: '{VALUE} is not a valid importance value (low, medium or high)',
      },
      default: 'medium',
    },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: 120,
    },
    company: { type: String, trim: true, maxlength: 120, default: 'Sample Company' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    category: { type: String, trim: true, maxlength: 80, default: 'General' },
    experienceLevel: {
      type: String,
      required: [true, 'experienceLevel is required'],
      enum: {
        values: SKILL_LEVELS,
        message: '{VALUE} is not a valid experience level',
      },
      default: 'beginner',
    },
    requiredSkills: { type: [requiredSkillSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Normalize + dedupe required skill names (same rules as user skills).
jobSchema.pre('validate', function normalizeSkills(next) {
  if (!this.requiredSkills || this.requiredSkills.length === 0) return next();

  const seen = new Map();
  for (const skill of this.requiredSkills) {
    skill.skillName = skill.skillName.trim().replace(/\s+/g, ' ');
    const key = skill.skillName.toLowerCase();
    if (seen.has(key)) {
      return next(
        new Error(`Duplicate required skill "${skill.skillName}" in job "${this.title}".`)
      );
    }
    seen.set(key, skill);
  }
  return next();
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
module.exports.SKILL_LEVELS = SKILL_LEVELS;
module.exports.IMPORTANCE_LEVELS = IMPORTANCE_LEVELS;
