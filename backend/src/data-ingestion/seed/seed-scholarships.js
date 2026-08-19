import { insertScholarship } from '../../repositories/scholarshipRepository.js';
import { logger } from '../../logging/logger.js';

// Placeholder curated rows, source_url populated so each can be re-verified before launch.
// eligible_nationalities: [] means open to all nationalities.
const SCHOLARSHIPS = [
  { name: 'Fulbright Foreign Student Program', eligibleNationalities: [], majorTags: [], amount: 40000, deadline: '2027-05-01', sourceUrl: 'https://foreign.fulbrightonline.org' },
  { name: 'Chevening Scholarship (UK)', eligibleNationalities: [], majorTags: [], amount: 35000, deadline: '2026-11-02', sourceUrl: 'https://www.chevening.org' },
  { name: 'Vanier Canada Graduate Scholarship', eligibleNationalities: [], majorTags: [], amount: 50000, deadline: '2026-11-03', sourceUrl: 'https://vanier.gc.ca' },
  { name: 'Australia Awards Scholarship', eligibleNationalities: [], majorTags: [], amount: 30000, deadline: '2027-04-30', sourceUrl: 'https://www.australiaawards.gov.au' },
  { name: 'DAAD Study Scholarship (Germany)', eligibleNationalities: [], majorTags: [], amount: 15000, deadline: '2026-10-15', sourceUrl: 'https://www.daad.de' },
  { name: 'Commonwealth Scholarship', eligibleNationalities: ['India', 'Pakistan', 'Bangladesh', 'Nigeria', 'Kenya'], majorTags: [], amount: 28000, deadline: '2026-12-15', sourceUrl: 'https://cscuk.fcdo.gov.uk' },
  { name: 'Schwarzman Scholars', eligibleNationalities: [], majorTags: ['business', 'economics'], amount: 60000, deadline: '2026-09-27', sourceUrl: 'https://www.schwarzmanscholars.org' },
  { name: 'Knight-Hennessy Scholars', eligibleNationalities: [], majorTags: [], amount: 80000, deadline: '2026-10-08', sourceUrl: 'https://knight-hennessy.stanford.edu' },
  { name: 'ETH Excellence Scholarship', eligibleNationalities: [], majorTags: ['computer_science', 'engineering'], amount: 12000, deadline: '2026-12-15', sourceUrl: 'https://ethz.ch/en/studies/master/application/financial/excellence-scholarship.html' },
  { name: 'Rotary Peace Fellowship', eligibleNationalities: [], majorTags: ['economics', 'law'], amount: 25000, deadline: '2027-05-15', sourceUrl: 'https://www.rotary.org/en/our-programs/peace-fellowships' },
];

export async function seedScholarships() {
  for (const scholarship of SCHOLARSHIPS) {
    await insertScholarship({ source: 'manual_curated', ...scholarship });
  }
  logger.info('Seeded scholarships', { count: SCHOLARSHIPS.length });
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedScholarships()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
