// Backs the Achievements tab (extracurriculars, research publications, work experience) —
// see constants/extracurriculars.js and ai-engine/admissionFitEngine.js. Stored as a single
// JSONB blob rather than a normalized table, matching the test_scores column's existing
// precedent (see migration 1700000006000_profile-degree-level.js): it's a variable-shape,
// per-student list that's only ever read/written as a whole by one owner (the profile
// owner), never queried across users, so JSONB avoids a join for no real benefit.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`ALTER TABLE profiles ADD COLUMN holistic_profile JSONB NOT NULL DEFAULT '{}';`);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE profiles DROP COLUMN holistic_profile;`);
}
