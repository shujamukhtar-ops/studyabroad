import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQsRankings } from '../sources/qs-rankings.js';
import { upsertSchoolFromSource } from '../../repositories/schoolRepository.js';
import { logger } from '../../logging/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '../data/qs-world-rankings-2026.csv');

// Static bundled data (this year's QS World University Rankings export), so this follows the
// seed-schools-manual.js pattern — a plain loop of upserts — rather than sync-schools.js's
// data_sync_log-tracked job, which exists for scripts that hit a live external API and can
// fail mid-run. This is the backing data for the per-country "best fits" list described in
// matchingService.js: schoolRepository.findCandidateSchools() filters by country and orders
// by world_rank, so a US-targeting profile only ever sees US-ranked schools, a UK-targeting
// one only UK-ranked schools, etc.
export async function seedQsRankings() {
  const schools = loadQsRankings(CSV_PATH);
  for (const school of schools) {
    await upsertSchoolFromSource(school);
  }
  logger.info('Seeded QS World University Rankings schools', { count: schools.length });
  return schools.length;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedQsRankings()
    .then((count) => {
      console.log(`Seeded ${count} QS-ranked schools.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
