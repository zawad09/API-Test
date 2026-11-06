/**
 * Zod schemas for user profile updates.
 *
 * All fields are optional: a PUT /api/users/profile only changes the fields
 * it receives (documented "partial update" behavior). Sending
 * currentSkills: [] clears the skill list; omitting it keeps it unchanged.
 */
const z = require('zod');

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];

const currentSkillSchema = z.object({
  skillName: z
    .string({ required_error: 'skillName is required for every skill' })
    .trim()
    .min(1, 'skillName cannot be empty')
    .max(60, 'skillName must be at most 60 characters'),
  proficiencyLevel: z.enum(SKILL_LEVELS, {
    errorMap: () => ({
      message: 'proficiencyLevel must be one of: beginner, intermediate, advanced',
    }),
  }),
});

const updateProfileSchema = z
  .object({
    education: z.string().trim().max(120, 'Education must be at most 120 characters').optional(),
    university: z.string().trim().max(160, 'University must be at most 160 characters').optional(),
    careerGoal: z.string().trim().max(300, 'Career goal must be at most 300 characters').optional(),
    experienceLevel: z
      .enum(SKILL_LEVELS, {
        errorMap: () => ({
          message: 'experienceLevel must be one of: beginner, intermediate, advanced',
        }),
      })
      .optional(),
    currentSkills: z
      .array(currentSkillSchema)
      .max(50, 'A profile can hold at most 50 skills')
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Reject duplicated skills inside the same request (case/space-insensitive).
    if (!data.currentSkills) return;
    const seen = new Set();
    data.currentSkills.forEach((skill, index) => {
      const key = skill.skillName.trim().replace(/\s+/g, ' ').toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['currentSkills', index, 'skillName'],
          message: `Duplicate skill "${skill.skillName}" - each skill can appear only once (case and extra spaces are ignored)`,
        });
      }
      seen.add(key);
    });
  });

module.exports = { updateProfileSchema, SKILL_LEVELS };
