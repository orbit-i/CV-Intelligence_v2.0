/**
 * Custom error class for expected/handled errors (validation, not found, etc).
 * Use this instead of throwing plain Error so we control the status code.
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Wraps async route handlers so thrown/rejected errors reach errorHandler
 * without needing try/catch in every controller.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Express recognizes this as an error middleware because it has 4 args.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Known Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflict',
      message: `A record with this ${err.meta?.target?.join(', ') || 'value'} already exists.`,
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Not Found', message: 'Record not found.' });
  }

  const statusCode = err.statusCode || 500;
  const payload = { error: err.name === 'Error' ? 'Server Error' : err.name, message: err.message };
  if (err.details) payload.details = err.details;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json(payload);
}

module.exports = { ApiError, asyncHandler, errorHandler };
