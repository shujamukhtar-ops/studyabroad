import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate.js';

describe('validate middleware', () => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

  it('calls next() with no error and normalizes req.body on valid input', () => {
    const req = { body: { email: 'a@b.com', password: 'password123', extra: 'ignored-by-schema-strip?' } };
    const next = vi.fn();
    validate(schema)(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ email: 'a@b.com', password: 'password123' });
  });

  it('rejects malformed input with a 400 VALIDATION_ERROR before reaching a controller', () => {
    const req = { body: { email: 'not-an-email', password: 'short' } };
    const next = vi.fn();
    validate(schema)(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.extra.details.fieldErrors.email).toBeDefined();
    expect(err.extra.details.fieldErrors.password).toBeDefined();
  });
});
