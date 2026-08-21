// findCandidateScholarships previously had no notion of which degree level (undergraduate,
// master's, PhD) a scholarship funds, so a PhD-only scholarship (e.g. the Vanier Canada
// Graduate Scholarship) could be shown to a student whose profile says they're applying for a
// bachelor's degree, and vice versa. degree_levels fixes that — same empty-array-means-open-
// to-all convention already used for eligible_nationalities/destination_countries (see
// migration 1700000010000_scholarships-destination-country.js), so a scholarship genuinely
// open to every degree level (or one whose source data doesn't say) still surfaces for
// everyone rather than being guessed into a level it doesn't state.
//
// Values are constrained to profiles.degree_level's own vocabulary ('undergraduate',
// 'graduate', 'phd' — see migration 1700000006000_profile-degree-level.js) so the two columns
// can be compared directly with no translation layer. Source data that names a level outside
// that vocabulary (e.g. the raw scholarships-worldwide.js dataset's "Course" token, meaning a
// non-degree short course) simply isn't extracted into this column — see
// data-ingestion/sources/scholarships-worldwide.js for that parsing.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE scholarships ADD COLUMN degree_levels TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE scholarships ADD CONSTRAINT scholarships_degree_levels_check
      CHECK (degree_levels <@ ARRAY['undergraduate', 'graduate', 'phd']::TEXT[]);
    CREATE INDEX idx_scholarships_degree_levels ON scholarships USING GIN (degree_levels);
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP INDEX idx_scholarships_degree_levels;
    ALTER TABLE scholarships DROP CONSTRAINT scholarships_degree_levels_check;
    ALTER TABLE scholarships DROP COLUMN degree_levels;
  `);
}
