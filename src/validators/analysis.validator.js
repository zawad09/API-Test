/**
 * Zod schemas for analysis / recommendation route parameters.
 * Mongo ObjectIds are 24-character hex strings - anything else gets a
 * clean 400 instead of a Mongoose CastError.
 */
const z = require('zod');

const objectIdSchema = (field) =>
  z
    .string({ required_error: `${field} is required` })
    .regex(/^[0-9a-fA-F]{24}$/, `Invalid ${field} format - must be a 24-character hex ObjectId`);

const jobIdParamSchema = z.object({ jobId: objectIdSchema('jobId') });
const idParamSchema = z.object({ id: objectIdSchema('id') });
const analysisIdParamSchema = z.object({ analysisId: objectIdSchema('analysisId') });

module.exports = { objectIdSchema, jobIdParamSchema, idParamSchema, analysisIdParamSchema };
