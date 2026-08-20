import { getProvider } from './provider.js';

const MODEL_VERSION = 'candidate-ranking-v1';

/**
 * Ranks and explains a list of candidates already filtered from Postgres by
 * services/matchingService.js. This function must never be given an unfiltered
 * candidate list, and its output is filtered back down to only ids it was given —
 * the model may reorder/explain, it may not introduce new schools.
 */
export async function rankCandidates(candidates, profile, context = {}, provider = getProvider()) {
  if (candidates.length === 0) {
    return [];
  }

  // fitsBySchoolId comes from ai-engine/admissionFitEngine.js (computed once in
  // matchingService.js from the student's academic + holistic indices) — the premium AI
  // ranking stage is told the same Reach/Target/Safety read the free tier shows outright, so
  // its written reasoning is grounded in those numbers rather than free to invent a
  // contradictory one. holisticProfile is the Achievements-tab data verbatim, since the model
  // can speak to a specific activity (e.g. "your Olympiad medal") in a way the fit category
  // alone can't.
  const { fitsBySchoolId = {}, holisticProfile = null } = context;

  const candidateSummaries = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
    avg_tuition: c.avg_tuition,
    admission_rate: c.admission_rate,
    world_rank: c.world_rank,
    heuristic_fit: fitsBySchoolId[c.id] ?? null,
  }));

  const prompt = `STAGE=ranking
You are ranking a fixed list of pre-approved schools for this student — you must not suggest
any school not in the provided list. Each candidate includes a heuristic_fit (category:
Reach/Target/Safety, fitScore 0-100) already computed from the student's academic and
holistic profile — use it as your starting point and explain *why* in your reasoning, don't
contradict it without cause. Return ONLY valid JSON:

{ "ranked": [ { "id": "<one of the given ids>", "score": 0-1, "reasoning": "1-2 sentences" } ] }

Student profile: ${JSON.stringify({
    target_countries: profile.target_countries,
    intended_major: profile.intended_major,
    budget_range: profile.budget_range,
    gpa: profile.gpa,
    degree_level: profile.degree_level,
  })}

Student achievements (extracurriculars, research, work experience): ${JSON.stringify(holisticProfile)}

Candidate schools (already filtered for eligibility/budget — rank and explain fit only):
${JSON.stringify(candidateSummaries)}`;

  const raw = await provider.invoke(prompt, { maxTokens: 1500 });
  const { ranked } = JSON.parse(raw);

  const validIds = new Set(candidates.map((c) => c.id));
  return ranked
    .filter((r) => validIds.has(r.id))
    .map((r) => ({ schoolId: r.id, score: r.score, reasoningText: r.reasoning, modelVersion: MODEL_VERSION }));
}
