import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/userRepository.js', () => ({
  findUserByEmail: vi.fn().mockResolvedValue(null),
  createUser: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', tier: 'basic' }),
  findUserById: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const { logger } = await import('../../src/logging/logger.js');

// Regression test: a terminal route handler mounted inside a sub-router (app.use('/api/auth', ...))
// that ends the response without calling next() never triggers Express's req.url restoration,
// so logging req.path directly (instead of req.originalUrl) silently truncated the logged path
// to the router-relative segment ('/register' instead of '/api/auth/register'). Error paths
// always call next(err), which does trigger the restore, so they never showed the bug — only a
// direct, successful response inside a mounted router reproduces it.
describe('request logging', () => {
  it('logs the full mounted path, not a router-relative fragment, for a direct (non-next) response', async () => {
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const app = createApp();

    await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: 'password123', homeCountry: 'India' });

    const requestLogCall = infoSpy.mock.calls.find(([message]) => message === 'request');
    expect(requestLogCall[1].path).toBe('/api/auth/register');

    infoSpy.mockRestore();
  });
});
