import { upsertScholarship } from '../../repositories/scholarshipRepository.js';
import { logger } from '../../logging/logger.js';

// Placeholder curated rows, source_url populated so each can be re-verified before launch.
// eligibleNationalities: [] means open to all nationalities. destinationCountries: [] means
// not tied to one of this app's supported destinations (Schwarzman funds study at Tsinghua
// in China; Rotary Peace Fellowships run at several Peace Centers across multiple countries)
// — left empty rather than guessed, per ARCHITECTURE.md §7's provenance rule, so it still
// surfaces for any search instead of being mistagged to a country it doesn't fund.
const SCHOLARSHIPS = [
  { externalId: 'fulbright-us', name: 'Fulbright Foreign Student Program', eligibleNationalities: [], destinationCountries: ['US'], majorTags: [], amount: 40000, deadline: '2027-05-01', sourceUrl: 'https://foreign.fulbrightonline.org' },
  { externalId: 'chevening-uk', name: 'Chevening Scholarship (UK)', eligibleNationalities: [], destinationCountries: ['UK'], majorTags: [], amount: 35000, deadline: '2026-11-02', sourceUrl: 'https://www.chevening.org' },
  { externalId: 'vanier-canada', name: 'Vanier Canada Graduate Scholarship', eligibleNationalities: [], destinationCountries: ['Canada'], majorTags: [], amount: 50000, deadline: '2026-11-03', sourceUrl: 'https://vanier.gc.ca' },
  { externalId: 'australia-awards', name: 'Australia Awards Scholarship', eligibleNationalities: [], destinationCountries: ['Australia'], majorTags: [], amount: 30000, deadline: '2027-04-30', sourceUrl: 'https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships' },
  { externalId: 'daad-germany', name: 'DAAD Study Scholarship (Germany)', eligibleNationalities: [], destinationCountries: ['Germany'], majorTags: [], amount: 15000, deadline: '2026-10-15', sourceUrl: 'https://www.daad.de' },
  // The CSC's Commonwealth Scholarship funds Commonwealth-nationality students to study in
  // the UK specifically — the eligibility axis (nationality) and the destination axis
  // (country funded) are genuinely different values here, which is exactly why the two are
  // now separate columns instead of one overloaded "country" field.
  { externalId: 'commonwealth', name: 'Commonwealth Scholarship', eligibleNationalities: ['India', 'Pakistan', 'Bangladesh', 'Nigeria', 'Kenya'], destinationCountries: ['UK'], majorTags: [], amount: 28000, deadline: '2026-12-15', sourceUrl: 'https://cscuk.fcdo.gov.uk' },
  { externalId: 'schwarzman', name: 'Schwarzman Scholars', eligibleNationalities: [], destinationCountries: [], majorTags: ['business', 'economics'], amount: 60000, deadline: '2026-09-27', sourceUrl: 'https://www.schwarzmanscholars.org' },
  { externalId: 'knight-hennessy-us', name: 'Knight-Hennessy Scholars', eligibleNationalities: [], destinationCountries: ['US'], majorTags: [], amount: 80000, deadline: '2026-10-08', sourceUrl: 'https://knight-hennessy.stanford.edu' },
  { externalId: 'eth-excellence-switzerland', name: 'ETH Excellence Scholarship', eligibleNationalities: [], destinationCountries: ['Switzerland'], majorTags: ['computer_science', 'engineering'], amount: 12000, deadline: '2026-12-15', sourceUrl: 'https://ethz.ch/en/studies/master/application/financial/excellence-scholarship.html' },
  { externalId: 'rotary-peace-fellowship', name: 'Rotary Peace Fellowship', eligibleNationalities: [], destinationCountries: [], majorTags: ['economics', 'law'], amount: 25000, deadline: '2027-05-15', sourceUrl: 'https://www.rotary.org/en/our-programs/peace-fellowships' },
];

export async function seedScholarships() {
  for (const scholarship of SCHOLARSHIPS) {
    await upsertScholarship({ source: 'manual_curated', ...scholarship });
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
