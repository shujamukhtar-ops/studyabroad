import { findCandidateSchools } from '../repositories/schoolRepository.js';
import { findCandidateScholarships } from '../repositories/scholarshipRepository.js';
import { saveMatchResults, listMatchResultsByUser } from '../repositories/matchResultRepository.js';
import { findUserById } from '../repositories/userRepository.js';
import { getProfile } from './profileService.js';
import { rankCandidates } from '../ai-engine/rankCandidates.js';

/**
 * Premium matching flow. This is the load-bearing boundary described in
 * ARCHITECTURE.md §7: the AI engine (rankCandidates) only ever sees candidates that
 * have already been filtered from Postgres by hard constraints (country, major, budget,
 * nationality). It cannot introduce a school or scholarship that isn't already a verified
 * row in our database.
 */
export async function computeMatches(user, { rank = rankCandidates } = {}) {
  const [profile, fullUser] = await Promise.all([getProfile(user.id), findUserById(user.id)]);

  const [candidateSchools, candidateScholarships] = await Promise.all([
    findCandidateSchools({
      targetCountries: profile.target_countries,
      intendedMajor: profile.intended_major,
      budgetRange: profile.budget_range,
    }),
    findCandidateScholarships({
      nationality: fullUser.home_country,
      intendedMajor: profile.intended_major,
    }),
  ]);

  const rankedSchools = await rank(candidateSchools, profile);
  await saveMatchResults(user.id, rankedSchools);

  return {
    schools: await listMatchResultsByUser(user.id),
    scholarships: candidateScholarships,
  };
}
