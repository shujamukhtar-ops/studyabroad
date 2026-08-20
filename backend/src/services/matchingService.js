import { findCandidateSchools } from '../repositories/schoolRepository.js';
import { saveMatchResults, listMatchResultsByUser } from '../repositories/matchResultRepository.js';
import { getProfile } from './profileService.js';
import { rankCandidates } from '../ai-engine/rankCandidates.js';
import {
  computeAcademicIndex,
  computeHolisticIndex,
  computeFit,
  explainFit,
  selectBalancedShortlist,
} from '../ai-engine/admissionFitEngine.js';

// Free tier gets a shorter, real list rather than the full pool — "limited capacity" per
// PRODUCT_NOTES, not a teaser of zero — every school still shown carries a genuine
// Reach/Target/Safety read (see admissionFitEngine.js), just without the holistic scoring or
// AI-personalized reasoning Premium adds.
const FREE_TIER_MATCH_LIMIT = 15;
const HEURISTIC_MODEL_VERSION = 'heuristic-free-v1';

/**
 * This is the load-bearing boundary described in ARCHITECTURE.md §7: the AI engine
 * (rankCandidates) only ever sees candidates that have already been filtered from Postgres by
 * hard constraints (country, major, budget). It cannot introduce a school that isn't already
 * a verified row in our database.
 *
 * Scholarship matching lives in services/scholarshipService.js now, behind its own
 * /api/scholarships tab — this function used to also fetch and return candidate
 * scholarships, which needed `findUserById` (for the applicant's nationality); neither is
 * used here any more.
 *
 * Both tiers get real matches now (previously the whole endpoint was premium-only — see
 * routes/matchesRoutes.js). What differs by tier:
 *  - Free: Reach/Target/Safety judged on academics alone (GPA + test scores), a shorter list,
 *    and deterministic templated reasoning (admissionFitEngine.js explainFit) — no AI
 *    provider call is made at all, so this costs nothing per request.
 *  - Premium: the fit additionally blends in the Achievements-tab holistic score
 *    (extracurriculars/research/work experience — computeHolisticIndex), the full candidate
 *    pool, and AI-generated reasoning per school (rankCandidates) that's told the same
 *    heuristic fit read so it explains rather than contradicts it.
 */
export async function computeMatches(user, { rank = rankCandidates } = {}) {
  const profile = await getProfile(user.id);
  const isPremium = user.tier === 'premium';

  const candidateSchools = await findCandidateSchools({
    targetCountries: profile.target_countries,
    intendedMajor: profile.intended_major,
    budgetRange: profile.budget_range,
  });

  const academicIndex = computeAcademicIndex({
    gpa: profile.gpa,
    degreeLevel: profile.degree_level,
    testScores: profile.test_scores,
  });
  const holisticIndex = isPremium ? computeHolisticIndex(profile.holistic_profile) : null;
  const fitsBySchoolId = Object.fromEntries(
    candidateSchools.map((school) => [school.id, computeFit({ academicIndex, holisticIndex }, school)])
  );

  let ranked;
  if (isPremium) {
    // The AI ranking stage owns score/reasoning; fitCategory is always the deterministic
    // heuristic read (attached here, not left to the model) so it's consistent whether or
    // not this student ever sees the free tier's version of the same number.
    const aiRanked = await rank(candidateSchools, profile, { fitsBySchoolId, holisticProfile: profile.holistic_profile });
    ranked = aiRanked.map((r) => ({ ...r, fitCategory: fitsBySchoolId[r.schoolId]?.category ?? null }));
  } else {
    const shortlist = selectBalancedShortlist(candidateSchools, fitsBySchoolId, FREE_TIER_MATCH_LIMIT);
    ranked = shortlist.map((school) => {
      const fit = fitsBySchoolId[school.id];
      return {
        schoolId: school.id,
        score: (fit?.fitScore ?? 0) / 100,
        reasoningText: explainFit(fit, school),
        modelVersion: HEURISTIC_MODEL_VERSION,
        fitCategory: fit?.category ?? null,
      };
    });
  }

  await saveMatchResults(user.id, ranked);

  return {
    schools: await listMatchResultsByUser(user.id),
    tier: user.tier,
    ...(isPremium
      ? {}
      : {
          upgradeNote:
            'These matches are ranked from your academic profile (GPA + test scores). Premium factors in your extracurriculars and research, and writes a personalized explanation for every match.',
        }),
  };
}
