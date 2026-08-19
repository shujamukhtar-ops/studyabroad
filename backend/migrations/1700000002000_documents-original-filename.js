// Adds a column to record the original filename when a document was uploaded as a file
// (.pdf, .docx, .txt, .md) rather than pasted as text — the extracted text still lands in
// the existing raw_text column, this is purely for showing the user what they uploaded.
// Null for pasted-text submissions.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE documents ADD COLUMN original_filename TEXT;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE documents DROP COLUMN original_filename;
  `);
}
