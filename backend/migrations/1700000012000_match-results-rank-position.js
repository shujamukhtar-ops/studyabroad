// Previously listMatchResultsByUser re-derived display order at read time from
// s.world_rank/m.score, because nothing persisted the order matchingService.js actually
// decided on. Neither of those two columns can express "closest match" (world_rank is a QS
// global-prestige signal that doesn't exist for most US schools now that US News profile data
// drives matching — see admissionFitEngine.js's profileDistance; score is a "how comfortably
// above the bar" fitScore, which is deliberately biased toward Safety schools). rank_position
// stores the real decided order (closest-profile-match first, then balanced-shortlist/AI
// reordering on top of that) so display just replays it.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE match_results ADD COLUMN rank_position INTEGER;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE match_results DROP COLUMN rank_position;
  `);
}
