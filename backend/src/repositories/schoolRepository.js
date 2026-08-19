import { query } from './db.js';

// Upper bound in USD for each budget band; null = no upper bound.
const BUDGET_CEILING = {
  '<15k': 15000,
  '15-30k': 30000,
  '30-50k': 50000,
  '50k+': null,
};

export async function findCandidateSchools({ targetCountries, intendedMajor, budgetRange }) {
  const ceiling = BUDGET_CEILING[budgetRange] ?? null;
  const { rows } = await query(
    `SELECT * FROM schools
     WHERE ($1::text[] IS NULL OR cardinality($1::text[]) = 0 OR country = ANY($1::text[]))
       AND ($2::text IS NULL OR cardinality(major_tags) = 0 OR $2::text = ANY(major_tags))
       AND ($3::numeric IS NULL OR avg_tuition IS NULL OR avg_tuition <= $3::numeric)
     ORDER BY
       -- Untagged schools are kept as candidates (see the major_tags clause above — "no
       -- data" isn't treated as "no match"), but they must not outrank schools that are
       -- actually confirmed to offer the requested major.
       CASE WHEN $2::text IS NOT NULL AND $2::text = ANY(major_tags) THEN 0 ELSE 1 END,
       admission_rate DESC NULLS LAST
     LIMIT 50`,
    [targetCountries ?? [], intendedMajor ?? null, ceiling]
  );
  return rows;
}

// The (source, external_id) unique constraint is what makes this safe: a sync job for
// source='college_scorecard' can only ever conflict with — and overwrite — other
// college_scorecard rows. A manual_curated row shares no conflict target with it, so an
// automated sync can structurally never clobber hand-entered data, even on external_id reuse.
export async function upsertSchoolFromSource(record) {
  const { source, externalId, name, country, majorTags, avgTuition, admissionRate, medianEarnings, completionRate, rawSourceData } = record;
  const { rows } = await query(
    `INSERT INTO schools (source, external_id, name, country, major_tags, avg_tuition, admission_rate, median_earnings, completion_rate, raw_source_data, last_synced_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (source, external_id) DO UPDATE SET
       name = EXCLUDED.name,
       country = EXCLUDED.country,
       major_tags = EXCLUDED.major_tags,
       avg_tuition = EXCLUDED.avg_tuition,
       admission_rate = EXCLUDED.admission_rate,
       median_earnings = EXCLUDED.median_earnings,
       completion_rate = EXCLUDED.completion_rate,
       raw_source_data = EXCLUDED.raw_source_data,
       last_synced_at = now()
     RETURNING *`,
    [source, externalId, name, country, majorTags ?? [], avgTuition, admissionRate, medianEarnings, completionRate, rawSourceData ?? {}]
  );
  return rows[0];
}
