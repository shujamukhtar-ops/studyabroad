import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { signToken } from '../../src/middleware/auth.js';

// No repository mocking needed here: checkTier runs before any controller/service/DB
// access, so a basic-tier caller must be rejected without the request ever reaching
// the database. That ordering is itself part of what this test verifies.
const app = createApp();

function tokenFor(tier) {
  return signToken({ id: 'user-1', tier });
}

describe('tier gating on premium-only routes (integration)', () => {
  it('rejects a basic-tier user hitting /api/matches directly, with the structured upgrade envelope', async () => {
    const res = await request(app).get('/api/matches').set('Authorization', `Bearer ${tokenFor('basic')}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: 'TIER_UPGRADE_REQUIRED',
        message: 'This feature requires a Premium subscription.',
        upgrade: { requiredTier: 'premium', currentTier: 'basic' },
      },
    });
  });

  it('rejects an unauthenticated request before it even reaches the tier check', async () => {
    const res = await request(app).get('/api/matches');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a basic-tier user on the other premium-gated route (cost-of-living) the same way', async () => {
    const res = await request(app).get('/api/cost-of-living?city=london').set('Authorization', `Bearer ${tokenFor('basic')}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TIER_UPGRADE_REQUIRED');
  });
});
