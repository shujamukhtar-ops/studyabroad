import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/schoolRepository.js', () => ({
  findCandidateSchools: vi.fn(),
}));
vi.mock('../../src/repositories/scholarshipRepository.js', () => ({
  findCandidateScholarships: vi.fn(),
}));
vi.mock('../../src/repositories/matchResultRepository.js', () => ({
  saveMatchResults: vi.fn(),
  listMatchResultsByUser: vi.fn(),
}));
vi.mock('../../src/repositories/userRepository.js', () => ({
  findUserById: vi.fn(),
}));
vi.mock('../../src/services/profileService.js', () => ({
  getProfile: vi.fn(),
}));

const { findCandidateSchools } = await import('../../src/repositories/schoolRepository.js');
const { findCandidateScholarships } = await import('../../src/repositories/scholarshipRepository.js');
const { saveMatchResults, listMatchResultsByUser } = await import('../../src/repositories/matchResultRepository.js');
const { findUserById } = await import('../../src/repositories/userRepository.js');
const { getProfile } = await import('../../src/services/profileService.js');
const { computeMatches } = await import('../../src/services/matchingService.js');

const PROFILE = { target_countries: ['US'], intended_major: 'computer_science', budget_range: '30-50k' };
const USER = { id: 'u1', tier: 'premium', home_country: 'India' };

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
  findUserById.mockResolvedValue(USER);
  findCandidateSchools.mockResolvedValue(FILTERED_CANDIDATES);
  findCandidateScholarships.mockResolvedValue([]);
  saveMatchResults.mockResolvedValue([]);
  listMatchResultsByUser.mockResolvedValue([{ school_id: 'school-1', score: 0.9 }]);
});

describe('computeMatches', () => {
  it('passes the DB-filtered candidate list to the ranker, never an unfiltered pool', async () => {
    const rank = vi.fn().mockResolvedValue([]);
    await computeMatches(USER, { rank });

    expect(rank).toHaveBeenCalledTimes(1);
    const candidatesPassedToRanker = rank.mock.calls[0][0];
    expect(candidatesPassedToRanker).toBe(FILTERED_CANDIDATES);
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

  it('uses the ranker output to persist match results', async () => {
    const ranked = [{ schoolId: 'school-1', score: 0.9, reasoningText: 'good fit', modelVersion: 'v1' }];
    const rank = vi.fn().mockResolvedValue(ranked);
    await computeMatches(USER, { rank });

    expect(saveMatchResults).toHaveBeenCalledWith(USER.id, ranked);
  });
});
