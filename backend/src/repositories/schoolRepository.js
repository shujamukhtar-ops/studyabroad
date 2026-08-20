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
    `WITH filtered AS (
       SELECT * FROM schools
       WHERE ($1::text[] IS NULL OR cardinality($1::text[]) = 0 OR country = ANY($1::text[]))
         AND ($2::text IS NULL OR cardinality(major_tags) = 0 OR $2::text = ANY(major_tags))
         AND ($3::numeric IS NULL OR avg_tuition IS NULL OR avg_tuition <= $3::numeric)
     ),
     -- The same real-world school can now legitimately have two rows — e.g. a hand-curated
     -- manual_curated row (with major_tags/tuition) and a qs_rankings row (with world_rank)
     -- for the same institution, since QS's country coverage overlaps seed-schools-manual.js's
     -- picks. Collapsing on (country, lower(name)) keeps a student from seeing "University of
     -- Oxford" twice; the manual_curated row wins the collapse when both exist because it
     -- carries richer, hand-verified data, otherwise the best-ranked remaining row does.
     deduped AS (
       SELECT DISTINCT ON (country, lower(name)) *
       FROM filtered
       ORDER BY country, lower(name),
         CASE WHEN source = 'manual_curated' THEN 0 ELSE 1 END,
         world_rank ASC NULLS LAST,
         admission_rate DESC NULLS LAST
     )
     SELECT id, source, external_id, name, country, major_tags, avg_tuition, admission_rate,
            median_earnings, completion_rate, world_rank, raw_source_data, last_synced_at, created_at
     FROM deduped
     ORDER BY
       -- Untagged schools are kept as candidates (see the major_tags clause above — "no
       -- data" isn't treated as "no match"), but they must not outrank schools that are
       -- actually confirmed to offer the requested major.
       CASE WHEN $2::text IS NOT NULL AND $2::text = ANY(major_tags) THEN 0 ELSE 1 END,
       -- world_rank (QS World University Rankings, when the row came from that source) is
       -- the strongest per-country quality signal we have and applies to far more rows than
       -- admission_rate does, so it takes priority; admission_rate remains the tiebreaker
       -- for schools QS doesn't rank.
       world_rank ASC NULLS LAST,
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
  const { source, externalId, name, country, majorTags, avgTuition, admissionRate, medianEarnings, completionRate, worldRank, rawSourceData } = record;
  const { rows } = await query(
    `INSERT INTO schools (source, external_id, name, country, major_tags, avg_tuition, admission_rate, median_earnings, completion_rate, world_rank, raw_source_data, last_synced_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
     ON CONFLICT (source, external_id) DO UPDATE SET
       name = EXCLUDED.name,
       country = EXCLUDED.country,
       major_tags = EXCLUDED.major_tags,
       avg_tuition = EXCLUDED.avg_tuition,
       admission_rate = EXCLUDED.admission_rate,
       median_earnings = EXCLUDED.median_earnings,
       completion_rate = EXCLUDED.completion_rate,
       world_rank = EXCLUDED.world_rank,
       raw_source_data = EXCLUDED.raw_source_data,
       last_synced_at = now()
     RETURNING *`,
    [source, externalId, name, country, majorTags ?? [], avgTuition, admissionRate, medianEarnings, completionRate, worldRank ?? null, rawSourceData ?? {}]
  );
  return rows[0];
}
