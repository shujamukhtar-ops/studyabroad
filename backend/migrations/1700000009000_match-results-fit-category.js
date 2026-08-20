// Persists the Reach/Target/Safety read from ai-engine/admissionFitEngine.js alongside each
// match, rather than only the raw 0-1 score — a student reads "Target" far faster than a
// score, and it's a deterministic heuristic output distinct from whatever the (premium-only)
// AI ranking stage produces, so it's computed once in matchingService.js and attached to
// every match regardless of which tier produced it.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE match_results ADD COLUMN fit_category TEXT
      CHECK (fit_category IN ('Reach', 'Target', 'Safety'));
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE match_results DROP COLUMN fit_category;
  `);
}
