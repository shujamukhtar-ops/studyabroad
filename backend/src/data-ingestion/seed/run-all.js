import { seedManualSchools } from './seed-schools-manual.js';
import { seedQsRankings } from './seed-qs-rankings.js';
import { seedUsNewsRankings } from './seed-usnews-rankings.js';
import { seedScholarships } from './seed-scholarships.js';
import { seedScholarshipsWorldwide } from './seed-scholarships-worldwide.js';
import { seedVisaRequirements } from './seed-visa.js';
import { seedEssays } from './seed-essays.js';

async function runAll() {
  await seedManualSchools();
  await seedQsRankings();
  // Runs after QS so its by-name enrichment (see seed-usnews-rankings.js) has both the
  // manual_curated and qs_rankings rows already in place to match against.
  await seedUsNewsRankings();
  await seedScholarships();
  await seedScholarshipsWorldwide();
  await seedVisaRequirements();
  await seedEssays();
  console.log('Seed data loaded. Run `npm run sync:schools` separately to pull US schools from College Scorecard.');
}

runAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
