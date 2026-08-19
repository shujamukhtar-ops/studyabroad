// Records which rubric (see backend/src/constants/essayTypes.js / ai-engine/sopRubric.js
// ESSAY_RUBRICS) a document's feedback was actually graded against — 'general' preserves the
// app's original single rubric as the default; the other six mirror rubrics published at
// https://gradpilot.com/rubrics for that specific application type.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE documents ADD COLUMN essay_type TEXT NOT NULL DEFAULT 'general'
      CHECK (essay_type IN ('general', 'undergraduate', 'graduate', 'phd', 'uk_undergraduate', 'scholarship', 'fellowship'));
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE documents DROP COLUMN essay_type;
  `);
}
