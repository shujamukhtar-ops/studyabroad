import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadUsNewsRankings } from '../sources/usnews-rankings.js';
import { enrichSchoolAcademicStats, upsertSchoolFromSource } from '../../repositories/schoolRepository.js';
import { logger } from '../../logging/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '../data/usnews-rankings-2026.csv');

// Static bundled data (this year's US News Best Colleges export), same seed-once pattern as
// seed-qs-rankings.js. Most of these ~1,665 US schools already have a row from
// college_scorecard/manual_curated/qs_rankings, so each is enriched in place with sat_avg/
// hs_gpa_avg first (see schoolRepository.enrichSchoolAcademicStats); only schools with no
// existing match at all become a new usnews_rankings row, genuinely expanding the candidate
// pool rather than duplicating it.
export async function seedUsNewsRankings() {
  const schools = loadUsNewsRankings(CSV_PATH);
  let enriched = 0;
  let inserted = 0;
  for (const school of schools) {
    const updatedRows = await enrichSchoolAcademicStats({
      country: school.country,
      name: school.name,
      satAvg: school.satAvg,
      hsGpaAvg: school.hsGpaAvg,
      netPriceAfterAid: school.netPriceAfterAid,
      pctReceivingAid: school.pctReceivingAid,
    });
    if (updatedRows > 0) {
      enriched += 1;
    } else {
      await upsertSchoolFromSource(school);
      inserted += 1;
    }
  }
  logger.info('Seeded US News rankings', { total: schools.length, enriched, inserted });
  return { total: schools.length, enriched, inserted };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedUsNewsRankings()
    .then(({ total, enriched, inserted }) => {
      console.log(`Processed ${total} US News rows — enriched ${enriched} existing schools, inserted ${inserted} new ones.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
