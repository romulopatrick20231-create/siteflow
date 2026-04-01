/**
 * asyncHandler.js — Wraps async route handlers to eliminate try/catch boilerplate.
 * All unhandled promise rejections flow to Express's global error middleware.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * send — Consistent success response helper.
 * @param {Response} res
 * @param {any} data
 * @param {number} statusCode
 */
export function send(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}
