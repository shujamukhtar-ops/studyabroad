import { seedManualSchools } from './seed-schools-manual.js';
import { seedScholarships } from './seed-scholarships.js';
import { seedVisaRequirements } from './seed-visa.js';
import { seedEssays } from './seed-essays.js';

async function runAll() {
  await seedManualSchools();
  await seedScholarships();
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
