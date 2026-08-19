import { query } from './db.js';

export async function saveMatchResults(userId, matches) {
  const saved = [];
  for (const match of matches) {
    const { rows } = await query(
      `INSERT INTO match_results (user_id, school_id, score, reasoning_text, model_version)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, school_id) DO UPDATE SET
         score = EXCLUDED.score,
         reasoning_text = EXCLUDED.reasoning_text,
         model_version = EXCLUDED.model_version,
         created_at = now()
       RETURNING *`,
      [userId, match.schoolId, match.score, match.reasoningText, match.modelVersion]
    );
    saved.push(rows[0]);
  }
  return saved;
}

export async function listMatchResultsByUser(userId) {
  const { rows } = await query(
    `SELECT m.*, s.name AS school_name, s.country AS school_country
     FROM match_results m JOIN schools s ON s.id = m.school_id
     WHERE m.user_id = $1 ORDER BY m.score DESC`,
    [userId]
  );
  return rows;
}
