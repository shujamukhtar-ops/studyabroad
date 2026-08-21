import { query } from './db.js';

export async function countUserDocumentsByType(userId, type) {
  const { rows } = await query(
    `SELECT count(*)::int AS count FROM documents WHERE user_id = $1 AND type = $2`,
    [userId, type]
  );
  return rows[0].count;
}

export async function createDocument({ userId, type, essayType, commonAppPromptId, rawText, tierAtAnalysis, originalFilename }) {
  const { rows } = await query(
    `INSERT INTO documents (user_id, type, essay_type, common_app_prompt_id, raw_text, tier_at_analysis, original_filename)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, type, essayType, commonAppPromptId ?? null, rawText, tierAtAnalysis, originalFilename ?? null]
  );
  return rows[0];
}

export async function findDocumentById(id) {
  const { rows } = await query(`SELECT * FROM documents WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listDocumentsByUser(userId) {
  const { rows } = await query(
    `SELECT * FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC`,
    [userId]
  );
  return rows;
}
