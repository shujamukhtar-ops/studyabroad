import { findCandidateScholarships } from '../repositories/scholarshipRepository.js';
import { findUserById } from '../repositories/userRepository.js';
import { getProfile } from './profileService.js';

// Split out from matchingService.js (which now only handles schools) so scholarships have
// their own page/tab — they're filtered candidates, not AI-ranked/tiered the way school
// matches are, so they don't need that service's tier branching at all.
export async function getScholarshipMatches(user) {
  const [profile, fullUser] = await Promise.all([getProfile(user.id), findUserById(user.id)]);

  const scholarships = await findCandidateScholarships({
    nationality: fullUser.home_country,
    intendedMajor: profile.intended_major,
    targetCountries: profile.target_countries,
  });

  return { scholarships };
}
