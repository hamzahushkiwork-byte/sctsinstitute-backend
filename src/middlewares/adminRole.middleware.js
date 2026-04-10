import { fail } from '../utils/response.js';

/** Requires authMiddleware first; JWT payload must include role: 'admin'. */
export function requireAdminRole(req, res, next) {
  if (req.user?.role !== 'admin') {
    return fail(res, 403, 'Admin access required');
  }
  return next();
}
