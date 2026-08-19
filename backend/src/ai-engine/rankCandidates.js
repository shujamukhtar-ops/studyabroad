import { getProvider } from './provider.js';

const MODEL_VERSION = 'candidate-ranking-v1';

/**
 * Ranks and explains a list of candidates already filtered from Postgres by
 * services/matchingService.js. This function must never be given an unfiltered
 * candidate list, and its output is filtered back down to only ids it was given —
 * the model may reorder/explain, it may not introduce new schools.
 */
export async function rankCandidates(candidates, profile, provider = getProvider()) {
  if (candidates.length === 0) {
    return [];
  }

  const candidateSummaries = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
    avg_tuition: c.avg_tuition,
    admission_rate: c.admission_rate,
  }));

  const prompt = `STAGE=ranking
You are ranking a fixed list of pre-approved schools for this student — you must not suggest
any school not in the provided list. Return ONLY valid JSON:

{ "ranked": [ { "id": "<one of the given ids>", "score": 0-1, "reasoning": "1-2 sentences" } ] }

Student profile: ${JSON.stringify({
    target_countries: profile.target_countries,
    intended_major: profile.intended_major,
    budget_range: profile.budget_range,
    gpa: profile.gpa,
  })}

Candidate schools (already filtered for eligibility/budget — rank and explain fit only):
${JSON.stringify(candidateSummaries)}`;

  const raw = await provider.invoke(prompt, { maxTokens: 1500 });
  const { ranked } = JSON.parse(raw);

  const validIds = new Set(candidates.map((c) => c.id));
  return ranked
    .filter((r) => validIds.has(r.id))
    .map((r) => ({ schoolId: r.id, score: r.score, reasoningText: r.reasoning, modelVersion: MODEL_VERSION }));
}
