import fs from 'node:fs';
import { parse } from 'csv-parse/sync';

// QS's own country/territory names don't always match the app's fixed COUNTRIES vocabulary
// (constants/countries.js) — e.g. QS says "United States of America", the app says "US" —
// and QS covers ~140 countries while the app only ever lets a student pick from 7. Rows for
// any other country are dropped at parse time rather than imported under a country code no
// profile can ever select, which would just be dead rows nobody's search can reach.
const COUNTRY_NAME_TO_CODE = {
  'United States of America': 'US',
  'United Kingdom': 'UK',
  Canada: 'Canada',
  Australia: 'Australia',
  Netherlands: 'Netherlands',
  Switzerland: 'Switzerland',
  Germany: 'Germany',
};

// QS reports a plain integer for higher-ranked schools but a tied range ("701-710") or an
// open-ended band ("1401+") once schools stop being individually ordered. Taking the first
// number in either case gives a stable, comparable sort key — ties within a band all get the
// band's lower bound, which is fine since findCandidateSchools() only needs "better than",
// not an exact global position.
function parseRank(raw) {
  const match = String(raw ?? '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function parseScore(raw) {
  if (raw === undefined || raw === null || raw === '' || raw === '-') return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Pure — no I/O — so it can be unit tested against a small fixture string, same as
// college-scorecard.js's mapRecordToSchool.
export function parseQsRankings(csvText) {
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, bom: true, trim: true });

  const schools = [];
  for (const row of rows) {
    const name = row['Institution Name'];
    const countryCode = COUNTRY_NAME_TO_CODE[row['Country/Territory']];
    if (!name || !countryCode) continue;

    schools.push({
      source: 'qs_rankings',
      externalId: `${countryCode}-${slugify(name)}`,
      name,
      country: countryCode,
      majorTags: [], // QS ranks institutions, not programs — no per-major signal to tag with
      avgTuition: null,
      admissionRate: null,
      medianEarnings: null,
      completionRate: null,
      worldRank: parseRank(row['2026 Rank']),
      rawSourceData: {
        qsRank2026: row['2026 Rank'],
        qsRankPrevious: row['Previous Rank'] || null,
        region: row['Region'] || null,
        size: row['Size'] || null,
        focus: row['Focus'] || null,
        research: row['Research'] || null,
        status: row['Status'] || null,
        overallScore: parseScore(row['Overall SCORE']),
      },
    });
  }
  return schools;
}

export function loadQsRankings(filePath) {
  const csvText = fs.readFileSync(filePath, 'utf8');
  return parseQsRankings(csvText);
}
