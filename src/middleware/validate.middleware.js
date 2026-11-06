/**
 * Generic Zod validation middleware.
 *
 * Usage:  router.post('/', validate({ body: registerSchema }), controller)
 *
 * You can validate any combination of req.params / req.query / req.body.
 * On success, the parsed (trimmed, lowercased, cleaned) values are written
 * back onto the request so controllers receive sanitized data.
 * On failure it responds 400 with:
 *
 *   { "success": false, "message": "Validation failed",
 *     "errors": [{ "field": "body.email", "message": "..." }] }
 */
const ApiError = require('../utils/ApiError');

const validate = (schemas) => (req, res, next) => {
  const errors = [];

  for (const source of ['params', 'query', 'body']) {
    const schema = schemas[source];
    if (!schema) continue;

    const result = schema.safeParse(req[source]);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          field: [source, ...issue.path].join('.') || source,
          message: issue.message,
        });
      }
    } else {
      // Write the cleaned data back (Express 4 allows reassigning these).
      if (source === 'body') req.body = result.data;
      if (source === 'params') req.params = result.data;
      if (source === 'query') req.query = result.data;
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed', errors));
  }
  return next();
};

module.exports = validate;
