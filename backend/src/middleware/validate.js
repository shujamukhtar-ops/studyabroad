import { AppError } from './errorHandler.js';

// Wraps a zod schema so malformed input is rejected before it reaches a controller.
// Usage: router.post('/x', validate(schema), controller.handler)
export function validate(schema) {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Request body failed validation.', {
          details: result.error.flatten(),
        })
      );
    }
    req.body = result.data;
    next();
  };
}
