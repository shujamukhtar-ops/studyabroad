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
            median_earnings, completion_rate, world_rank, sat_avg, hs_gpa_avg, raw_source_data,
            last_synced_at, created_at
     FROM deduped
     ORDER BY
       -- sat_avg (US News's own reported incoming-class average — see
       -- data-ingestion/sources/usnews-rankings.js) leads: it's a specific school's real
       -- profile, not an estimate, so it's the primary signal for picking which candidates
       -- matchingService.js gets to compute a genuine profile-distance "closest match" against
       -- (see admissionFitEngine.js's computeFit/profileDistance). world_rank (QS, the only
       -- selectivity signal at all for non-US countries, which US News doesn't cover) is next,
       -- not first — this used to be the primary key, which is what the old QS-rank-band
       -- fallback logic needed; now it's a secondary signal.
       sat_avg IS NOT NULL DESC,
       world_rank ASC NULLS LAST,
       -- Among schools tied on both of the above (almost always both null — a small local
       -- college with no reported averages and no QS rank), a school confirmed to offer the
       -- requested major still outranks one with no major data at all.
       CASE WHEN $2::text IS NOT NULL AND $2::text = ANY(major_tags) THEN 0 ELSE 1 END,
       -- admission_rate remains the final tiebreaker for schools with none of the above.
       admission_rate DESC NULLS LAST
     LIMIT 200`,
    [targetCountries ?? [], intendedMajor ?? null, ceiling]
  );
  return rows;
}

// The (source, external_id) unique constraint is what makes this safe: a sync job for
// source='college_scorecard' can only ever conflict with — and overwrite — other
// college_scorecard rows. A manual_curated row shares no conflict target with it, so an
// automated sync can structurally never clobber hand-entered data, even on external_id reuse.
export async function upsertSchoolFromSource(record) {
  const { source, externalId, name, country, majorTags, avgTuition, admissionRate, medianEarnings, completionRate, worldRank, satAvg, hsGpaAvg, rawSourceData } = record;
  const { rows } = await query(
    `INSERT INTO schools (source, external_id, name, country, major_tags, avg_tuition, admission_rate, median_earnings, completion_rate, world_rank, sat_avg, hs_gpa_avg, raw_source_data, last_synced_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
     ON CONFLICT (source, external_id) DO UPDATE SET
       name = EXCLUDED.name,
       country = EXCLUDED.country,
       major_tags = EXCLUDED.major_tags,
       avg_tuition = EXCLUDED.avg_tuition,
       admission_rate = EXCLUDED.admission_rate,
       median_earnings = EXCLUDED.median_earnings,
       completion_rate = EXCLUDED.completion_rate,
       world_rank = EXCLUDED.world_rank,
       sat_avg = EXCLUDED.sat_avg,
       hs_gpa_avg = EXCLUDED.hs_gpa_avg,
       raw_source_data = EXCLUDED.raw_source_data,
       last_synced_at = now()
     RETURNING *`,
    [source, externalId, name, country, majorTags ?? [], avgTuition, admissionRate, medianEarnings, completionRate, worldRank ?? null, satAvg ?? null, hsGpaAvg ?? null, rawSourceData ?? {}]
  );
  return rows[0];
}

// US News covers ~1,665 US schools, most of which already exist in `schools` from
// college_scorecard/manual_curated/qs_rankings (under source values this row's own
// (source, external_id) upsert can't touch — see upsertSchoolFromSource's comment). Rather
// than insert a *second* row for a school we already have — which would need
// findCandidateSchools' dedup step to reconcile two rows' data instead of just picking a
// winner — this updates sat_avg/hs_gpa_avg directly on whichever existing row(s) match by
// name, so the school that ends up as the actual candidate (per the existing dedup priority)
// already carries the new data. Matches ignore a trailing parenthetical abbreviation (e.g.
// qs_rankings' "Massachusetts Institute of Technology (MIT)" vs US News' "Massachusetts
// Institute of Technology") since that's the one systematic naming difference observed
// between these two sources' names for the same school. Returns how many rows were updated,
// so the seed script knows whether to fall back to inserting a brand-new usnews_rankings row
// for a school that wasn't already in the table at all.
export async function enrichSchoolAcademicStats({ country, name, satAvg, hsGpaAvg }) {
  const { rows } = await query(
    `UPDATE schools
     SET sat_avg = $3, hs_gpa_avg = $4
     WHERE country = $1
       AND (lower(name) = lower($2) OR lower(regexp_replace(name, '\\s*\\([^)]*\\)\\s*$', '')) = lower($2))
     RETURNING id`,
    [country, name, satAvg ?? null, hsGpaAvg ?? null]
  );
  return rows.length;
}
