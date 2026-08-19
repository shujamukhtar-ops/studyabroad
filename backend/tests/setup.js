// Runs before any test file. Sets the env vars config/env.js fail-fasts on, so the whole
// suite can run without a real .env or a live database — the DB layer is mocked per-test
// where it's touched at all.
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test_unused';
process.env.JWT_SECRET ??= 'test-secret-do-not-use-in-production';
process.env.AI_PROVIDER ??= 'mock';
