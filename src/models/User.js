/**
 * User model - account + career information.
 *
 * Notes for readers:
 * - "password" is always hashed (bcrypt) and uses select:false, so it is
 *   NEVER returned by normal queries. Login explicitly opts in with
 *   .select('+password').
 * - currentSkills is an array of { skillName, proficiencyLevel } objects.
 *   A pre-validate hook trims the names and REJECTS duplicates, ignoring
 *   capitalization and extra whitespace ("  node.js " === "Node.js").
 */
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];

const currentSkillSchema = new mongoose.Schema(
  {
    skillName: {
      type: String,
      required: [true, 'skillName is required for every skill'],
      trim: true,
      minlength: 1,
      maxlength: 60,
    },
    proficiencyLevel: {
      type: String,
      required: [true, 'proficiencyLevel is required for every skill'],
      enum: {
        values: SKILL_LEVELS,
        message: '{VALUE} is not a valid proficiency level (beginner, intermediate or advanced)',
      },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // never fetched unless explicitly requested
    },
    education: { type: String, trim: true, maxlength: 120, default: '' },
    university: { type: String, trim: true, maxlength: 160, default: '' },
    currentSkills: { type: [currentSkillSchema], default: [] },
    careerGoal: { type: String, trim: true, maxlength: 300, default: '' },
    experienceLevel: {
      type: String,
      enum: { values: SKILL_LEVELS, message: '{VALUE} is not a valid experience level' },
      default: 'beginner',
    },
  },
  { timestamps: true } // adds createdAt and updatedAt
);

/**
 * Normalize skill names and prevent duplicates inside one profile.
 * Comparison ignores capitalization and extra whitespace.
 */
userSchema.pre('validate', function normalizeSkills(next) {
  if (!this.currentSkills || this.currentSkills.length === 0) return next();

  const seen = new Map();
  for (const skill of this.currentSkills) {
    skill.skillName = skill.skillName.trim().replace(/\s+/g, ' ');
    const key = skill.skillName.toLowerCase();
    if (seen.has(key)) {
      return next(
        ApiError.badRequest(
          `Duplicate skill "${skill.skillName}" - each skill can appear only once (case and extra spaces are ignored).`
        )
      );
    }
    seen.set(key, skill);
  }
  return next();
});

// Keep JSON responses clean: strip password hash and Mongo version key.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.SKILL_LEVELS = SKILL_LEVELS;
