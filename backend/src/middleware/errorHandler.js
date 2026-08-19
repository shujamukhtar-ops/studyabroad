import { logger } from '../logging/logger.js';

export class AppError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

// Central place every error passes through. Handlers/services should throw AppError
// (or let unexpected errors bubble) rather than shaping error responses themselves.
export function errorHandler(err, req, res, _next) {
  const status = err.status ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message = status >= 500 ? 'Something went wrong.' : err.message;

  if (status >= 500) {
    logger.error('Unhandled request error', { err, path: req.path, method: req.method });
  }

  res.status(status).json({
    error: { code, message, ...(err.extra ?? {}) },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}
