// Scholarships previously had no notion of which country they fund study *in* — only
// eligible_nationalities (which country an applicant is *from*), a completely different axis.
// findCandidateScholarships never filtered by the student's target countries at all, so a
// student targeting the UK could be shown a Canada-specific scholarship. destination_countries
// fixes that (see data-ingestion/sources/scholarships-worldwide.js and seed-scholarships.js).
//
// external_id + a new 'scraped_archive' source value follow the exact pattern schools already
// uses (see migration 1700000000000_init-schema.js): UNIQUE(source, external_id) makes
// re-running the archive seed idempotent instead of duplicating ~300 rows on every run, and
// keeps an automated import from ever colliding with a hand-curated row.
//
// amount_text/eligibility_note hold the original readable strings ("Up to $10,000", "Full
// tuition fees coverage", "Master, Bachelor, PhD") — `amount` stays a NUMERIC best-effort
// parse for sorting, but most real award/eligibility text isn't reducible to a single number
// or a major_tags-style enum without guessing, which the app avoids doing (see ARCHITECTURE.md
// §7's provenance rule).

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE scholarships DROP CONSTRAINT scholarships_source_check;
    ALTER TABLE scholarships ADD CONSTRAINT scholarships_source_check
      CHECK (source IN ('manual_curated', 'partner_api', 'scraped_archive'));
    ALTER TABLE scholarships ADD COLUMN external_id TEXT;
    ALTER TABLE scholarships ADD COLUMN destination_countries TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE scholarships ADD COLUMN amount_text TEXT;
    ALTER TABLE scholarships ADD COLUMN eligibility_note TEXT;
    CREATE UNIQUE INDEX idx_scholarships_source_external_id ON scholarships(source, external_id)
      WHERE external_id IS NOT NULL;
    CREATE INDEX idx_scholarships_destination_countries ON scholarships USING GIN (destination_countries);
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP INDEX idx_scholarships_destination_countries;
    DROP INDEX idx_scholarships_source_external_id;
    ALTER TABLE scholarships DROP COLUMN eligibility_note;
    ALTER TABLE scholarships DROP COLUMN amount_text;
    ALTER TABLE scholarships DROP COLUMN destination_countries;
    ALTER TABLE scholarships DROP COLUMN external_id;
    ALTER TABLE scholarships DROP CONSTRAINT scholarships_source_check;
    ALTER TABLE scholarships ADD CONSTRAINT scholarships_source_check
      CHECK (source IN ('manual_curated', 'partner_api'));
  `);
}
