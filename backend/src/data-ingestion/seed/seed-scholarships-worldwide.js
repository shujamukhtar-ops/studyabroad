import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScholarshipsWorldwide } from '../sources/scholarships-worldwide.js';
import { upsertScholarship } from '../../repositories/scholarshipRepository.js';
import { logger } from '../../logging/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../data/university-scholarships-worldwide.json');

// Static bundled archive data, so this follows seed-scholarships.js's/seed-qs-rankings.js's
// plain-upsert-loop pattern rather than sync-schools.js's data_sync_log-tracked job (reserved
// for scripts that hit a live external API and can fail mid-run). See
// data-ingestion/sources/scholarships-worldwide.js for how this archive's ~880 raw rows get
// filtered down to the ~290 with a verifiably correct destination country.
export async function seedScholarshipsWorldwide() {
  const scholarships = loadScholarshipsWorldwide(DATA_PATH);
  for (const scholarship of scholarships) {
    await upsertScholarship(scholarship);
  }
  logger.info('Seeded archive scholarships', { count: scholarships.length });
  return scholarships.length;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedScholarshipsWorldwide()
    .then((count) => {
      console.log(`Seeded ${count} archive scholarships.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
