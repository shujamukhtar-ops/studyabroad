import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/schoolRepository.js', () => ({
  findCandidateSchools: vi.fn(),
}));
vi.mock('../../src/repositories/matchResultRepository.js', () => ({
  saveMatchResults: vi.fn(),
  listMatchResultsByUser: vi.fn(),
}));
vi.mock('../../src/services/profileService.js', () => ({
  getProfile: vi.fn(),
}));

const { findCandidateSchools } = await import('../../src/repositories/schoolRepository.js');
const { saveMatchResults, listMatchResultsByUser } = await import('../../src/repositories/matchResultRepository.js');
const { getProfile } = await import('../../src/services/profileService.js');
const { computeMatches } = await import('../../src/services/matchingService.js');

// Scholarship matching moved to services/scholarshipService.js / its own /api/scholarships
// tab (see matchingService.js's doc comment) — this file only covers school matching now.
const PROFILE = { target_countries: ['US'], intended_major: 'computer_science', budget_range: '30-50k' };
const USER = { id: 'u1', tier: 'premium' };

// A much larger pool than what the (mocked) DB query says is eligible — stands in for
// "every school in the database" so we can prove the AI ranking step never sees it.
const UNFILTERED_POOL = Array.from({ length: 500 }, (_, i) => ({ id: `unfiltered-${i}`, name: `School ${i}` }));
const FILTERED_CANDIDATES = [
  { id: 'school-1', name: 'Eligible School A' },
  { id: 'school-2', name: 'Eligible School B' },
];

beforeEach(() => {
  vi.clearAllMocks();
  getProfile.mockResolvedValue(PROFILE);
  findCandidateSchools.mockResolvedValue(FILTERED_CANDIDATES);
  saveMatchResults.mockResolvedValue([]);
  listMatchResultsByUser.mockResolvedValue([{ school_id: 'school-1', score: 0.9 }]);
});

describe('computeMatches', () => {
  it('passes the DB-filtered candidate list to the ranker, never an unfiltered pool', async () => {
    const rank = vi.fn().mockResolvedValue([]);
    await computeMatches(USER, { rank });

    expect(rank).toHaveBeenCalledTimes(1);
    // The ranker is now given a re-sorted copy (closest-profile-match first — see
    // matchingService.js), not the literal array findCandidateSchools returned, so this checks
    // the same *set* of candidates made it through rather than array identity.
    const candidatesPassedToRanker = rank.mock.calls[0][0];
    expect(candidatesPassedToRanker).toEqual(expect.arrayContaining(FILTERED_CANDIDATES));
    expect(candidatesPassedToRanker).not.toEqual(expect.arrayContaining(UNFILTERED_POOL));
    expect(candidatesPassedToRanker.length).toBe(2);
  });

  it('derives query filters from the profile (country/major/budget), not caller-supplied values', async () => {
    const rank = vi.fn().mockResolvedValue([]);
    await computeMatches(USER, { rank });

    expect(findCandidateSchools).toHaveBeenCalledWith({
      targetCountries: PROFILE.target_countries,
      intendedMajor: PROFILE.intended_major,
      budgetRange: PROFILE.budget_range,
    });
  });

  it('uses the ranker output, with a heuristic fit category attached, to persist match results', async () => {
    const ranked = [{ schoolId: 'school-1', score: 0.9, reasoningText: 'good fit', modelVersion: 'v1' }];
    const rank = vi.fn().mockResolvedValue(ranked);
    await computeMatches(USER, { rank });

    // fitCategory is null here because the fixture profile/candidates carry no
    // GPA/test-score/selectivity data for computeFit() to work with (see the dedicated
    // admissionFitEngine tests for the scoring itself) — the point of this test is that
    // whatever the ranker returns still flows through to persistence, plus the attached fields.
    expect(saveMatchResults).toHaveBeenCalledWith(USER.id, [{ ...ranked[0], fitCategory: null, rankPosition: 1 }]);
  });

  it('does not include an upgradeNote for a premium user', async () => {
    const rank = vi.fn().mockResolvedValue([]);
    const result = await computeMatches(USER, { rank });
    expect(result.upgradeNote).toBeUndefined();
    expect(result.tier).toBe('premium');
  });
});

// Free tier gets real matches now too (see matchingService.js) — no AI provider call, a
// shorter list, and academics-only reasoning from admissionFitEngine.js instead.
describe('computeMatches (free tier)', () => {
  const BASIC_USER = { id: 'u1', tier: 'basic' };
  const MANY_CANDIDATES = Array.from({ length: 20 }, (_, i) => ({
    id: `school-${i}`,
    name: `School ${i}`,
    world_rank: (i + 1) * 10,
  }));

  beforeEach(() => {
    findCandidateSchools.mockResolvedValue(MANY_CANDIDATES);
  });

  it('never calls the AI ranker for a basic-tier user', async () => {
    const rank = vi.fn().mockResolvedValue([]);
    await computeMatches(BASIC_USER, { rank });
    expect(rank).not.toHaveBeenCalled();
  });

  it('persists a heuristic-ranked, capped-length list built without the ranker', async () => {
    await computeMatches(BASIC_USER);

    expect(saveMatchResults).toHaveBeenCalledTimes(1);
    const [userId, saved] = saveMatchResults.mock.calls[0];
    expect(userId).toBe(BASIC_USER.id);
    expect(saved.length).toBeLessThanOrEqual(15);
    expect(saved.length).toBeGreaterThan(0);
    for (const match of saved) {
      expect(match.modelVersion).toBe('heuristic-free-v1');
      expect(typeof match.reasoningText).toBe('string');
    }
  });

  it('includes a subtle upgradeNote for a basic-tier user', async () => {
    const result = await computeMatches(BASIC_USER);
    expect(typeof result.upgradeNote).toBe('string');
    expect(result.upgradeNote.length).toBeGreaterThan(0);
    expect(result.tier).toBe('basic');
  });
});
