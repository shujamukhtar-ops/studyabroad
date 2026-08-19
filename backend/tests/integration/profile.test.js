import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/profileRepository.js', () => ({
  upsertProfile: vi.fn(),
  findProfileByUserId: vi.fn(),
}));

const { upsertProfile, findProfileByUserId } = await import('../../src/repositories/profileRepository.js');
const { createApp } = await import('../../src/app.js');
const { signToken } = await import('../../src/middleware/auth.js');

const app = createApp();
const token = signToken({ id: 'user-1', tier: 'basic' });

beforeEach(() => vi.clearAllMocks());

describe('profile creation (integration)', () => {
  it('creates a profile and returns it', async () => {
    const body = { targetCountries: ['US', 'UK'], intendedMajor: 'computer_science', budgetRange: '30-50k', gpa: 3.8 };
    upsertProfile.mockResolvedValue({ user_id: 'user-1', ...body });

    const res = await request(app).post('/api/profile').set('Authorization', `Bearer ${token}`).send(body);

    expect(res.status).toBe(200);
    expect(upsertProfile).toHaveBeenCalledWith('user-1', expect.objectContaining({ intendedMajor: 'computer_science' }));
    expect(res.body.profile.user_id).toBe('user-1');
  });

  it('returns 404 PROFILE_NOT_FOUND when none exists yet', async () => {
    findProfileByUserId.mockResolvedValue(null);
    const res = await request(app).get('/api/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('rejects an unauthenticated profile request', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid budgetRange enum value with 400', async () => {
    const res = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ budgetRange: 'not-a-real-band' });
    expect(res.status).toBe(400);
    expect(upsertProfile).not.toHaveBeenCalled();
  });
});
