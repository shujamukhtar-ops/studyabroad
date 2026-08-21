// Matches previously had no way for a student to actually go apply, or to see what they'd
// realistically pay after aid — just world_rank/avg_tuition. Both are real, official fields
// already published by sources this app already ingests, not scraped or invented:
//   - College Scorecard (college-scorecard.js) publishes `school.school_url` (the
//     institution's own official website) and `school.price_calculator_url` (the federally
//     mandated Net Price Calculator every US Title-IV school must host — a personalized,
//     official "what will I actually pay after aid" tool, not this app's own estimate).
//   - US News (usnews-rankings.js) publishes `cost_after_aid` (the school's own reported
//     average net price actually paid, across students who received aid) and
//     `pct_receiving_aid`, which gives that average figure context.
// See DATA_SOURCES.md for the full sourcing writeup.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE schools ADD COLUMN website_url TEXT;
    ALTER TABLE schools ADD COLUMN net_price_calculator_url TEXT;
    ALTER TABLE schools ADD COLUMN net_price_after_aid NUMERIC;
    ALTER TABLE schools ADD COLUMN pct_receiving_aid NUMERIC;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE schools DROP COLUMN pct_receiving_aid;
    ALTER TABLE schools DROP COLUMN net_price_after_aid;
    ALTER TABLE schools DROP COLUMN net_price_calculator_url;
    ALTER TABLE schools DROP COLUMN website_url;
  `);
}
