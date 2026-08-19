import { query } from './db.js';

export async function createFeedback({ documentId, stage, analysisJson, modelVersion }) {
  const { rows } = await query(
    `INSERT INTO feedback (document_id, stage, analysis_json, model_version)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [documentId, stage, analysisJson, modelVersion]
  );
  return rows[0];
}

export async function listFeedbackByDocument(documentId) {
  const { rows } = await query(
    `SELECT * FROM feedback WHERE document_id = $1 ORDER BY created_at ASC`,
    [documentId]
  );
  return rows;
}
