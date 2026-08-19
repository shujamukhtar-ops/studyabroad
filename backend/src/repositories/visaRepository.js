import { query } from './db.js';

export async function findVisaRequirement(destinationCountry) {
  const { rows } = await query(
    `SELECT * FROM visa_requirements WHERE destination_country = $1`,
    [destinationCountry]
  );
  return rows[0] ?? null;
}

// last_reviewed_at only gets set when reviewedBy is provided — a row with reviewed_by=NULL
// is visibly unreviewed placeholder data, not something a human has actually signed off on.
export async function insertVisaRequirement(record) {
  const { destinationCountry, checklistJson, sourceUrl, reviewedBy } = record;
  const { rows } = await query(
    `INSERT INTO visa_requirements (destination_country, checklist_json, source_url, last_reviewed_at, reviewed_by)
     VALUES ($1, $2, $3, CASE WHEN $4::text IS NOT NULL THEN now() ELSE NULL END, $4)
     ON CONFLICT (destination_country) DO UPDATE SET
       checklist_json = EXCLUDED.checklist_json,
       source_url = EXCLUDED.source_url,
       last_reviewed_at = CASE WHEN EXCLUDED.reviewed_by IS NOT NULL THEN now() ELSE visa_requirements.last_reviewed_at END,
       reviewed_by = COALESCE(EXCLUDED.reviewed_by, visa_requirements.reviewed_by)
     RETURNING *`,
    // node-postgres serializes a bare JS array as a Postgres array literal, not JSON —
    // it must be stringified explicitly for a JSONB column.
    [destinationCountry, JSON.stringify(checklistJson), sourceUrl, reviewedBy]
  );
  return rows[0];
}
