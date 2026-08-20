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

// /api/matches used to be in this file too — it was fully premium-gated at the route level.
// It no longer is: matchingService.computeMatches() now serves both tiers and branches
// internally on user.tier (see matchingService.js), so a basic-tier request reaches the
// controller/service/DB instead of being rejected up front. That tier-dependent *behavior*
// (holistic scoring, AI reasoning, list length — all premium-only) is covered by
// tests/unit/matchingService.test.js instead, where the DB is already mocked.
describe('tier gating on premium-only routes (integration)', () => {
  it('rejects an unauthenticated request before it even reaches the controller', async () => {
    const res = await request(app).get('/api/cost-of-living?city=london');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a basic-tier user on the premium-gated cost-of-living route with the structured upgrade envelope', async () => {
    const res = await request(app).get('/api/cost-of-living?city=london').set('Authorization', `Bearer ${tokenFor('basic')}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: 'TIER_UPGRADE_REQUIRED',
        message: 'This feature requires a Premium subscription.',
        upgrade: { requiredTier: 'premium', currentTier: 'basic' },
      },
    });
  });
});
