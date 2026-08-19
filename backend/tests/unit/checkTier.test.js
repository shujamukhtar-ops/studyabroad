import { describe, it, expect, vi } from 'vitest';
import { checkTier } from '../../src/middleware/checkTier.js';

function mockReqRes(tier) {
  const req = { user: { id: 'u1', tier } };
  const res = {};
  const next = vi.fn();
  return { req, res, next };
}

describe('checkTier middleware', () => {
  it('allows a premium user through a premium-gated route', () => {
    const { req, res, next } = mockReqRes('premium');
    checkTier('premium')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows a basic user through a basic-gated route', () => {
    const { req, res, next } = mockReqRes('basic');
    checkTier('basic')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks a basic user from a premium-gated route with the structured upgrade envelope, not a bare 403', () => {
    const { req, res, next } = mockReqRes('basic');
    checkTier('premium')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(403);
    expect(err.code).toBe('TIER_UPGRADE_REQUIRED');
    expect(err.extra.upgrade).toEqual({ requiredTier: 'premium', currentTier: 'basic' });
  });

  it('treats a missing req.user.tier as basic rather than throwing', () => {
    const req = { user: undefined };
    const next = vi.fn();
    checkTier('premium')(req, {}, next);
    expect(next.mock.calls[0][0].code).toBe('TIER_UPGRADE_REQUIRED');
  });
});
