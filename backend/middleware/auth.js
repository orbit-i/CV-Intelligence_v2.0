const { ApiError } = require('./errorHandler');

// ============================================================================
// INTEGRATION NOTE for Abu bakar's Auth module:
// This module assumes a JWT auth middleware runs BEFORE these routes and
// attaches `req.user = { id, organizationId, role }` to the request
// (role is "ORG_ADMIN" or "RECRUITER" per PRD section 6).
//
// Mount order in app.js should be:
//   app.use('/api', verifyJwt)        <- Abu bakar's middleware, sets req.user
//   app.use('/api/candidates', candidatesRouter)
//   app.use('/api/recruiters', recruitersRouter)
//
// Until that's wired in, requireAuth below throws 401 if req.user is missing,
// so these routes fail safe rather than silently allowing unauthenticated access.
// ============================================================================

function requireAuth(req, res, next) {
  // DEV BYPASS: inject a mock user until Abu Bakar's JWT middleware is wired in
  if (!req.user && process.env.NODE_ENV !== 'production') {
    req.user = { id: 'dev-user', organizationId: process.env.DEV_ORG_ID || 'dev-org', role: 'ORG_ADMIN' };
  }
  if (!req.user) {
    return next(new ApiError(401, 'Unauthorized', 'Missing authenticated user context.'));
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized', 'Missing authenticated user context.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden', `Requires role: ${allowedRoles.join(' or ')}`));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
