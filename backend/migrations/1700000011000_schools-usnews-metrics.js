// Backs the US News rankings ingestion (see data-ingestion/sources/usnews-rankings.js): a new
// 'usnews_rankings' source value, plus two columns admissionFitEngine.js's schoolThreshold()
// prefers over its QS-rank-band / admission_rate-band proxies whenever they're available —
// sat_avg and hs_gpa_avg are a school's own reported incoming-class averages, normalized
// exactly the way computeAcademicIndex() normalizes a student's own numbers, so "is this
// student's academic index above or below this specific school's" becomes a direct comparison
// instead of an estimate derived from the school's rank position.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE schools DROP CONSTRAINT schools_source_check;
    ALTER TABLE schools ADD CONSTRAINT schools_source_check
      CHECK (source IN ('college_scorecard', 'hesa_discover_uni', 'manual_curated', 'qs_rankings', 'usnews_rankings'));
    ALTER TABLE schools ADD COLUMN sat_avg NUMERIC;
    ALTER TABLE schools ADD COLUMN hs_gpa_avg NUMERIC;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE schools DROP COLUMN hs_gpa_avg;
    ALTER TABLE schools DROP COLUMN sat_avg;
    ALTER TABLE schools DROP CONSTRAINT schools_source_check;
    ALTER TABLE schools ADD CONSTRAINT schools_source_check
      CHECK (source IN ('college_scorecard', 'hesa_discover_uni', 'manual_curated', 'qs_rankings'));
  `);
}
