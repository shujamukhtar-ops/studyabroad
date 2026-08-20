// Deterministic, non-AI admission-fit heuristics. This is what lets a Reach/Target/Safety
// read exist for every candidate school even when no AI provider call is made at all (the
// free tier — see matchingService.js), and it's the numeric input the premium AI ranking
// stage (rankCandidates.js) is given alongside the raw profile so its written reasoning is
// grounded in the same numbers a student would see explained on the free tier. Like
// sopRubric.js and testRecommendations.js elsewhere in this codebase, this is a "good enough
// estimate," not an admissions decision — real committees weigh essays, recommendations, and
// institutional priorities this app has no visibility into.

const SAT_MIN = 800;
const SAT_MAX = 1600;
const GRE_MIN = 260; // GRE's headline score is Verbal + Quant only, 130-170 each — see constants/testTypes.js
const GRE_MAX = 340;
const GMAT_MIN = 205; // GMAT Focus Edition's official total range — see constants/testTypes.js
const GMAT_MAX = 805;

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function findTestEntry(testScores, key) {
  return (testScores ?? []).find((entry) => entry.test === key);
}

// A test entry's `total` is normally already computed client-side before it's saved (see
// frontend/src/pages/ProfilePage.jsx computeSumTotal / manual entry) but this re-derives it
// from sections when missing, so the fit engine doesn't silently drop a score just because a
// caller wrote test_scores directly without going through that flow.
function totalOf(entry, sumFrom) {
  if (typeof entry?.total === 'number') return entry.total;
  if (!sumFrom || !entry?.sections) return null;
  const values = sumFrom.map((key) => entry.sections[key]);
  if (values.some((v) => typeof v !== 'number')) return null;
  return values.reduce((sum, v) => sum + v, 0);
}

// Approximates the College Board's official ACT-SAT concordance (2018) with a single linear
// fit anchored at ACT 20 -> SAT 1110 and ACT 36 -> SAT 1590 — accurate enough for a fit
// *estimate*, not a substitute for the real concordance table.
function actToSat(actComposite) {
  return 30 * actComposite + 510;
}

function undergraduateTestNorm(testScores) {
  const sat = totalOf(findTestEntry(testScores, 'sat'), ['math', 'reading_writing']);
  const satEquivalent = sat ?? (() => {
    const act = totalOf(findTestEntry(testScores, 'act'));
    return act !== null ? actToSat(act) : null;
  })();
  if (satEquivalent === null) return null;
  return clamp01((satEquivalent - SAT_MIN) / (SAT_MAX - SAT_MIN)) * 100;
}

function graduateTestNorm(testScores) {
  const gre = totalOf(findTestEntry(testScores, 'gre'), ['verbal', 'quant']);
  if (gre !== null) return clamp01((gre - GRE_MIN) / (GRE_MAX - GRE_MIN)) * 100;
  const gmat = totalOf(findTestEntry(testScores, 'gmat'));
  if (gmat !== null) return clamp01((gmat - GMAT_MIN) / (GMAT_MAX - GMAT_MIN)) * 100;
  return null;
}

// 0-100 estimate of pure academic competitiveness: GPA plus whichever standardized test
// applies to the student's degree level. Deliberately available to both tiers — it's the
// baseline "am I academically in range" signal every applicant already has the moment
// they've filled in GPA/test scores on the Profile page, no Achievements-tab data required.
export function computeAcademicIndex({ gpa, degreeLevel, testScores }) {
  const gpaNorm = typeof gpa === 'number' ? clamp01(gpa / 4.0) * 100 : null;
  const testNorm = degreeLevel === 'undergraduate' ? undergraduateTestNorm(testScores) : graduateTestNorm(testScores);

  if (gpaNorm === null && testNorm === null) return null;
  if (gpaNorm === null) return testNorm;
  if (testNorm === null) return gpaNorm;
  return gpaNorm * 0.5 + testNorm * 0.5;
}

// Points per activity tier (constants/extracurriculars.js) — Tier 1 is worth roughly 3x a
// Tier 4, matching how selective admissions readers describe weighting rare/exceptional
// activities far above routine participation, per the CollegeVine 4-tier framework this
// vocabulary borrows from.
const TIER_POINTS = { tier1: 25, tier2: 15, tier3: 8, tier4: 3 };

// Beyond ~6 strong activities, an admissions reader's attention (and this heuristic's
// scoring) stops meaningfully increasing — a long list of low-tier entries doesn't
// compensate for a thin one of high-tier entries, so only the strongest few count.
const MAX_SCORED_ACTIVITIES = 6;

// 0-100 estimate of holistic strength from extracurriculars, research publications, and work
// experience. Premium-only signal in matchingService.js, because it needs data the student
// fills in on the Achievements tab, not just numbers already on the Profile page. Returns
// null (not 0) when nothing's been entered, so callers fall back to the pure academic index
// instead of unfairly treating "hasn't filled this out yet" as "weak profile."
export function computeHolisticIndex(holisticProfile) {
  const extracurriculars = holisticProfile?.extracurriculars ?? [];
  const publications = holisticProfile?.researchPublications ?? 0;
  const workYears = holisticProfile?.workExperienceYears ?? 0;

  if (extracurriculars.length === 0 && !publications && !workYears) return null;

  const ecPoints = extracurriculars
    .map((entry) => TIER_POINTS[entry.tier] ?? 0)
    .sort((a, b) => b - a)
    .slice(0, MAX_SCORED_ACTIVITIES)
    .reduce((sum, points) => sum + points, 0);

  const pubPoints = Math.min(40, publications * 15); // weighted heavily — see graduate-admissions note below
  const workPoints = Math.min(20, workYears * 5);

  return Math.min(100, ecPoints + pubPoints + workPoints);
}

// The most precise selectivity signal available: this specific school's own reported
// incoming-class average SAT and/or HS GPA (US News — see data-ingestion/sources/
// usnews-rankings.js), normalized on exactly the same 0-100 scale computeAcademicIndex()
// normalizes a student's own GPA/SAT onto. Where the rank/admission-rate bands below are an
// estimate of "roughly how selective is a school in this tier," this is a direct comparison —
// exactly the "3.5 GPA isn't automatically a good fit for MIT, but 3.99+1600 is" distinction
// this engine exists to make. It's still institution-wide undergraduate-admits data applied
// as a general selectivity signal regardless of the student's own degree level, the same
// simplification world_rank/admission_rate already carry below.
function selectivityFromSchoolAverages(school) {
  const satNorm = typeof school.sat_avg === 'number' ? clamp01((school.sat_avg - SAT_MIN) / (SAT_MAX - SAT_MIN)) * 100 : null;
  const gpaNorm = typeof school.hs_gpa_avg === 'number' ? clamp01(school.hs_gpa_avg / 4.0) * 100 : null;
  if (satNorm === null && gpaNorm === null) return null;
  if (satNorm === null) return gpaNorm;
  if (gpaNorm === null) return satNorm;
  return satNorm * 0.5 + gpaNorm * 0.5;
}

// A school's selectivity, standing in for admission_rate when — as for most QS-sourced rows
// (see data-ingestion/sources/qs-rankings.js) — that isn't available. Bands are calibrated
// against publicly reported Common Data Set middle-50% SAT/GPA ranges: schools in QS's global
// top ~20 (MIT, Stanford, the Ivies, ...) admit students clustered at the very top of the
// score distribution (middle-50% SAT commonly 1450-1580), so reaching "Target" there requires
// an academic index most applicants don't have — see computeFit(). Rank bands widen further
// down the list since selectivity drops off faster than rank position does.
function schoolThreshold(school) {
  const fromAverages = selectivityFromSchoolAverages(school);
  if (fromAverages !== null) return fromAverages;
  if (typeof school.world_rank === 'number') {
    if (school.world_rank <= 20) return 90;
    if (school.world_rank <= 50) return 80;
    if (school.world_rank <= 100) return 68;
    if (school.world_rank <= 300) return 52;
    return 38;
  }
  if (typeof school.admission_rate === 'number') {
    if (school.admission_rate < 0.15) return 90;
    if (school.admission_rate < 0.3) return 80;
    if (school.admission_rate < 0.5) return 68;
    if (school.admission_rate < 0.7) return 52;
    return 38;
  }
  return 55; // no selectivity signal at all for this school — a neutral, uncommitted default
}

// Blends academic + (when available) holistic strength against a school's selectivity band
// into a Reach/Target/Safety read — the same three-way language admissions counselors already
// use, rather than a bare number a student has to interpret themselves. `holisticIndex` is
// null on the free tier (or when a premium student hasn't filled in the Achievements tab
// yet), in which case the fit is judged on academics alone.
export function computeFit({ academicIndex, holisticIndex }, school) {
  if (academicIndex === null || academicIndex === undefined) return null;

  const usedHolistic = typeof holisticIndex === 'number';
  const blended = usedHolistic ? academicIndex * 0.65 + holisticIndex * 0.35 : academicIndex;

  const threshold = schoolThreshold(school);
  const diff = blended - threshold;
  const fitScore = Math.max(0, Math.min(100, Math.round(50 + diff)));

  let category;
  if (diff >= 12) category = 'Safety';
  else if (diff >= -8) category = 'Target';
  else category = 'Reach';

  return { category, fitScore, blendedIndex: Math.round(blended), threshold, usedHolistic };
}

// A raw fit-score sort systematically buries Reach and even Target schools under every
// Safety school, because a school well below a student's level always scores higher on
// "how comfortably do you clear the bar" than one right at or above it — for a strong
// student that means a shortlist that's nothing but safety schools, which is exactly the
// "just gives colleges in order" complaint this engine exists to fix. A human counselor
// instead builds a list with a deliberate mix: a handful of ambitious reaches, more
// realistic targets, a couple of sure things. This reproduces that mix by quota, keeping
// each category's existing order (world_rank ascending — see schoolRepository.js) so the
// most prestigious school in each bucket is still favored.
const DEFAULT_SHORTLIST_QUOTA = { Reach: 5, Target: 8, Safety: 3 };

export function selectBalancedShortlist(candidateSchools, fitsBySchoolId, limit, quota = DEFAULT_SHORTLIST_QUOTA) {
  const buckets = { Reach: [], Target: [], Safety: [], Unrated: [] };
  for (const school of candidateSchools) {
    const category = fitsBySchoolId[school.id]?.category ?? 'Unrated';
    buckets[category].push(school);
  }

  const selected = [
    ...buckets.Reach.slice(0, quota.Reach ?? 0),
    ...buckets.Target.slice(0, quota.Target ?? 0),
    ...buckets.Safety.slice(0, quota.Safety ?? 0),
  ];

  if (selected.length < limit) {
    const usedIds = new Set(selected.map((s) => s.id));
    const leftovers = [...buckets.Reach, ...buckets.Target, ...buckets.Safety, ...buckets.Unrated].filter(
      (school) => !usedIds.has(school.id)
    );
    selected.push(...leftovers.slice(0, limit - selected.length));
  }

  return selected.slice(0, limit);
}

// Deterministic, templated reasoning — used as the free tier's entire "reasoning" text (no AI
// call is made for that tier at all, see matchingService.js) and never shown on the premium
// tier, where rankCandidates.js's AI-generated reasoning replaces it. Not personalized beyond
// restating the numbers behind the category.
export function explainFit(fit, school) {
  if (!fit) return `Add your GPA or test scores to your profile to see how you compare at ${school.name}.`;

  const base = `Based on your academic profile, ${school.name} looks like a ${fit.category.toLowerCase()} for you`;
  if (fit.category === 'Safety') {
    return `${base} — your academic index is comfortably above where this school's selectivity tier typically lands.`;
  }
  if (fit.category === 'Reach') {
    return `${base} — this school's selectivity tier is meaningfully above your current academic index, so treat it as an ambitious application.`;
  }
  return `${base} — your academic index is in the range where this school's selectivity tier typically lands.`;
}
