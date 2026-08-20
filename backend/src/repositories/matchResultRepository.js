import { query } from './db.js';

export async function saveMatchResults(userId, matches) {
  // Each computeMatches() run re-derives candidates from the student's current profile
  // (target countries, major, budget), so a school that isn't a candidate this time — e.g.
  // because the student switched their target country from UK to US — must stop being one
  // of "their matches" too. Without this, ON CONFLICT below only ever upserts rows for
  // schools still in the new candidate list, leaving every previous run's rows (from a
  // different country/major/budget) stranded in the table forever, so a student who changes
  // their target country would see a stale mix of both countries' schools indefinitely.
  const keepIds = matches.map((m) => m.schoolId);
  await query(
    `DELETE FROM match_results WHERE user_id = $1 AND NOT (school_id = ANY($2::uuid[]))`,
    [userId, keepIds]
  );

  const saved = [];
  for (const match of matches) {
    const { rows } = await query(
      `INSERT INTO match_results (user_id, school_id, score, reasoning_text, model_version, fit_category)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, school_id) DO UPDATE SET
         score = EXCLUDED.score,
         reasoning_text = EXCLUDED.reasoning_text,
         model_version = EXCLUDED.model_version,
         fit_category = EXCLUDED.fit_category,
         created_at = now()
       RETURNING *`,
      [userId, match.schoolId, match.score, match.reasoningText, match.modelVersion, match.fitCategory ?? null]
    );
    saved.push(rows[0]);
  }
  return saved;
}

export async function listMatchResultsByUser(userId) {
  // world_rank first, not score first: a raw fit-score sort would put every "Safety" match
  // ahead of every "Reach"/"Target" one (see admissionFitEngine.js's selectBalancedShortlist
  // comment for why), undoing the balanced mix the free tier deliberately selects. Sorting by
  // prestige with score as the tiebreaker gives a browsing order that matches how a student
  // actually wants to scan a list — most recognizable schools first — while fit_category and
  // score (shown per-card) still carry the "how realistic is this for me" signal.
  const { rows } = await query(
    `SELECT m.*, s.name AS school_name, s.country AS school_country, s.world_rank AS school_world_rank
     FROM match_results m JOIN schools s ON s.id = m.school_id
     WHERE m.user_id = $1 ORDER BY s.world_rank ASC NULLS LAST, m.score DESC`,
    [userId]
  );
  return rows;
}
