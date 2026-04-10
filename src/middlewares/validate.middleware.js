import { fail } from '../utils/response.js';

/**
 * Middleware to validate request body using Zod schema
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Zod v4 uses `issues`; v3 used `errors`
      const issues = result.error?.issues ?? result.error?.errors ?? [];
      const errors = issues.map((issue) => ({
        field: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path ?? ''),
        message: issue.message,
      }));

      return fail(res, 422, 'Validation failed', errors);
    }

    req.body = result.data;
    next();
  };
}



