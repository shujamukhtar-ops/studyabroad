import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/scholarshipRepository.js', () => ({
  findCandidateScholarships: vi.fn(),
}));
vi.mock('../../src/repositories/userRepository.js', () => ({
  findUserById: vi.fn(),
}));
vi.mock('../../src/services/profileService.js', () => ({
  getProfile: vi.fn(),
}));

const { findCandidateScholarships } = await import('../../src/repositories/scholarshipRepository.js');
const { findUserById } = await import('../../src/repositories/userRepository.js');
const { getProfile } = await import('../../src/services/profileService.js');
const { getScholarshipMatches } = await import('../../src/services/scholarshipService.js');

const PROFILE = { target_countries: ['UK'], intended_major: 'law', budget_range: '30-50k' };
const USER = { id: 'u1', tier: 'basic' };
const FULL_USER = { id: 'u1', home_country: 'India' };
const SCHOLARSHIPS = [{ id: 's1', name: 'Chevening Scholarship (UK)' }];

beforeEach(() => {
  vi.clearAllMocks();
  getProfile.mockResolvedValue(PROFILE);
  findUserById.mockResolvedValue(FULL_USER);
  findCandidateScholarships.mockResolvedValue(SCHOLARSHIPS);
});

describe('getScholarshipMatches', () => {
  it('derives query filters from the profile and account, not caller-supplied values', async () => {
    await getScholarshipMatches(USER);

    expect(findCandidateScholarships).toHaveBeenCalledWith({
      nationality: FULL_USER.home_country,
      intendedMajor: PROFILE.intended_major,
      targetCountries: PROFILE.target_countries,
    });
  });

  it('returns the candidate scholarships unmodified, for any tier', async () => {
    const result = await getScholarshipMatches(USER);
    expect(result).toEqual({ scholarships: SCHOLARSHIPS });
  });
});
