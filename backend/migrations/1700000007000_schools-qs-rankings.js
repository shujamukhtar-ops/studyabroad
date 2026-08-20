// Backs the QS World University Rankings ingestion (see
// data-ingestion/seed/seed-qs-rankings.js): schools.source needs a new allowed value for
// these rows, and world_rank lets findCandidateSchools() sort a country's candidates by
// actual global ranking instead of falling back to admission_rate (which QS data doesn't
// provide) for every QS-sourced row.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE schools DROP CONSTRAINT schools_source_check;
    ALTER TABLE schools ADD CONSTRAINT schools_source_check
      CHECK (source IN ('college_scorecard', 'hesa_discover_uni', 'manual_curated', 'qs_rankings'));
    ALTER TABLE schools ADD COLUMN world_rank INTEGER;
    CREATE INDEX idx_schools_world_rank ON schools(world_rank);
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP INDEX idx_schools_world_rank;
    ALTER TABLE schools DROP COLUMN world_rank;
    ALTER TABLE schools DROP CONSTRAINT schools_source_check;
    ALTER TABLE schools ADD CONSTRAINT schools_source_check
      CHECK (source IN ('college_scorecard', 'hesa_discover_uni', 'manual_curated'));
  `);
}
