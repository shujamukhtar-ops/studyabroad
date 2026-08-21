import fs from 'node:fs';
import { parse } from 'csv-parse/sync';

// This export is US News's own "Best Colleges" scrape, all US institutions (every row carries
// a state/zip) — it complements qs-rankings.js rather than overlapping it: QS covers a few
// hundred globally elite schools, this covers ~1,665 US schools across every selectivity tier,
// each with the school's own reported incoming-class averages. rank_numeric/rank_display are
// US News's national rank, a different scale from QS's global rank, so it's deliberately never
// written to schools.world_rank (that column's meaning is fixed to "QS position" — see
// migration 1700000007000_schools-qs-rankings.js) — only sat_avg/hs_gpa_avg feed the fit
// engine here.
function parseNumber(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

// A rep score is only assigned to schools US News surveyed for that specific program area, so
// its mere presence (regardless of the score itself) is a real signal the school has a
// notable-enough program to be evaluated — same "presence is the signal" reasoning
// college-scorecard.js already uses for its 2%-of-degrees major tagging.
function inferMajorTags(row) {
  const tags = [];
  if (row.engineering_rep_score) tags.push('engineering');
  if (row.business_rep_score) tags.push('business');
  return tags;
}

// Pure — no I/O — so it can be unit tested against a small fixture string, same as
// college-scorecard.js's mapRecordToSchool and qs-rankings.js's parseQsRankings.
export function parseUsNewsRankings(csvText) {
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, bom: true, trim: true });

  const schools = [];
  for (const row of rows) {
    const name = row.name;
    if (!name || !row.id) continue;

    schools.push({
      source: 'usnews_rankings',
      externalId: row.id,
      name,
      country: 'US',
      majorTags: inferMajorTags(row),
      avgTuition: parseNumber(row.tuition),
      admissionRate: parseNumber(row.acceptance_rate) !== null ? parseNumber(row.acceptance_rate) / 100 : null,
      medianEarnings: null,
      completionRate: null,
      worldRank: null,
      satAvg: parseNumber(row.sat_avg),
      hsGpaAvg: parseNumber(row.hs_gpa_avg),
      // The school's own reported average net price actually paid after aid, and the % of
      // students who receive aid for context — promoted to top-level fields (like satAvg/
      // hsGpaAvg above) since they feed real columns (schools.net_price_after_aid/
      // pct_receiving_aid) rather than staying buried in the audit-only raw payload.
      netPriceAfterAid: parseNumber(row.cost_after_aid),
      pctReceivingAid: parseNumber(row.pct_receiving_aid),
      rawSourceData: {
        usNewsRankDisplay: row.rank_display || null,
        usNewsRankNumeric: parseNumber(row.rank_numeric),
        schoolType: row.school_type || null,
        control: row.control || null,
        region: row.region || null,
        state: row.state || null,
        city: row.city || null,
        actAvg: parseNumber(row.act_avg),
        enrollment: parseNumber(row.enrollment),
        engineeringRepScore: parseNumber(row.engineering_rep_score),
        businessRepScore: parseNumber(row.business_rep_score),
        profileUrl: row.profile_url || null,
      },
    });
  }
  return schools;
}

export function loadUsNewsRankings(filePath) {
  const csvText = fs.readFileSync(filePath, 'utf8');
  return parseUsNewsRankings(csvText);
}
