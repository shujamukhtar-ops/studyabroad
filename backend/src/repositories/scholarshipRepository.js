import { query } from './db.js';

export async function findCandidateScholarships({ nationality, intendedMajor }) {
  const { rows } = await query(
    `SELECT * FROM scholarships
     WHERE (cardinality(eligible_nationalities) = 0 OR $1::text = ANY(eligible_nationalities))
       AND ($2::text IS NULL OR cardinality(major_tags) = 0 OR $2::text = ANY(major_tags))
       AND (deadline IS NULL OR deadline >= CURRENT_DATE)
     ORDER BY amount DESC NULLS LAST
     LIMIT 50`,
    [nationality ?? null, intendedMajor ?? null]
  );
  return rows;
}

export async function insertScholarship(record) {
  const { source, name, eligibleNationalities, majorTags, amount, deadline, sourceUrl, verifiedBy } = record;
  const { rows } = await query(
    `INSERT INTO scholarships (source, name, eligible_nationalities, major_tags, amount, deadline, source_url, verified_at, verified_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $8::text IS NOT NULL THEN now() ELSE NULL END, $8)
     RETURNING *`,
    [source, name, eligibleNationalities ?? [], majorTags ?? [], amount, deadline, sourceUrl, verifiedBy ?? null]
  );
  return rows[0];
}
