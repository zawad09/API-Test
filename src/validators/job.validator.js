/**
 * Zod schema for the optional job list filters:
 *   GET /api/jobs?category=Backend Development&experienceLevel=beginner
 */
const z = require('zod');

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];

const jobQuerySchema = z.object({
  category: z.string().trim().max(80, 'Category filter is too long').optional(),
  experienceLevel: z
    .enum(SKILL_LEVELS, {
      errorMap: () => ({
        message: 'experienceLevel filter must be one of: beginner, intermediate, advanced',
      }),
    })
    .optional(),
});

module.exports = { jobQuerySchema, SKILL_LEVELS };
