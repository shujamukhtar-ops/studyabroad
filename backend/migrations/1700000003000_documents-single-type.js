// Statement of purpose and essay were never actually different document types in this
// product — same upload flow, same rubric, same feedback shape — so the sop/essay split in
// the `type` column was a distinction without a difference, and transcripts were never
// analyzed any differently despite being a listed option. Collapsing to a single type
// removes a UI choice that didn't do anything and a DB enum that no longer means anything.
// See DocumentsPage.jsx / documentService.js for the corresponding app-code simplification.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    UPDATE documents SET type = 'essay' WHERE type != 'essay';
    ALTER TABLE documents DROP CONSTRAINT documents_type_check;
    ALTER TABLE documents ALTER COLUMN type SET DEFAULT 'essay';
    ALTER TABLE documents ADD CONSTRAINT documents_type_check CHECK (type = 'essay');
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE documents DROP CONSTRAINT documents_type_check;
    ALTER TABLE documents ALTER COLUMN type DROP DEFAULT;
    ALTER TABLE documents ADD CONSTRAINT documents_type_check CHECK (type = ANY (ARRAY['sop'::text, 'essay'::text, 'transcript'::text]));
  `);
}
