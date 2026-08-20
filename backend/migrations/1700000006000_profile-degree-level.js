// Which level of program the student is applying to — needed to know whether to recommend
// undergraduate tests (SAT/ACT) or graduate ones (GRE/GMAT) for their profile (see
// constants/testRecommendations.js). test_scores' shape also changed at the same time, from
// an unstructured {"toefl":110} object to an array of { test, sections, total, testDate }
// entries (see constants/testTypes.js and routes/schemas.js) — that's an application-layer
// change only and needs no migration since the column stays JSONB.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE profiles ADD COLUMN degree_level TEXT
      CHECK (degree_level IN ('undergraduate', 'graduate', 'phd'));
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE profiles DROP COLUMN degree_level;
  `);
}
