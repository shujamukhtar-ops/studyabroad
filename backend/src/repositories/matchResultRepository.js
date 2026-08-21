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
      `INSERT INTO match_results (user_id, school_id, score, reasoning_text, model_version, fit_category, rank_position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, school_id) DO UPDATE SET
         score = EXCLUDED.score,
         reasoning_text = EXCLUDED.reasoning_text,
         model_version = EXCLUDED.model_version,
         fit_category = EXCLUDED.fit_category,
         rank_position = EXCLUDED.rank_position,
         created_at = now()
       RETURNING *`,
      [userId, match.schoolId, match.score, match.reasoningText, match.modelVersion, match.fitCategory ?? null, match.rankPosition ?? null]
    );
    saved.push(rows[0]);
  }
  return saved;
}

export async function listMatchResultsByUser(userId) {
  // rank_position is the order matchingService.js actually decided on for this student —
  // closest-profile-match first (admissionFitEngine.js's profileDistance, computed from US
  // News per-school SAT/GPA averages when available), then tier-specific reordering on top
  // (balanced Reach/Target/Safety quotas for free, the AI's own ranking for premium). Neither
  // world_rank (a QS global-prestige signal most US schools don't have) nor score (biased
  // toward Safety schools by construction) can reconstruct that order after the fact, so it's
  // persisted and replayed verbatim; score DESC only remains as a tiebreaker for any legacy
  // row saved before rank_position existed.
  const { rows } = await query(
    `SELECT m.*, s.name AS school_name, s.country AS school_country, s.world_rank AS school_world_rank,
            s.avg_tuition AS school_avg_tuition, s.net_price_after_aid AS school_net_price_after_aid,
            s.pct_receiving_aid AS school_pct_receiving_aid, s.website_url AS school_website_url,
            s.net_price_calculator_url AS school_net_price_calculator_url
     FROM match_results m JOIN schools s ON s.id = m.school_id
     WHERE m.user_id = $1 ORDER BY m.rank_position ASC NULLS LAST, m.score DESC`,
    [userId]
  );
  return rows;
}
