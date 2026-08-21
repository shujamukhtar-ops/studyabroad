import { upsertSchoolFromSource } from '../../repositories/schoolRepository.js';
import { logger } from '../../logging/logger.js';

// Placeholder curated rows for countries with no College-Scorecard-equivalent API
// (see DATA_SOURCES.md "Not yet automated"). Figures are approximate starting points —
// each row needs a real spot-check against the school's own published figures before
// being shown to real users; source_url equivalents live in raw_source_data.note.
const MANUAL_SCHOOLS = [
  { externalId: 'uk-oxford', name: 'University of Oxford', country: 'UK', majorTags: ['computer_science', 'economics', 'law'], avgTuition: 38000, admissionRate: 0.14, note: 'https://www.ox.ac.uk/admissions' },
  { externalId: 'uk-imperial', name: 'Imperial College London', country: 'UK', majorTags: ['computer_science', 'engineering'], avgTuition: 40000, admissionRate: 0.15, note: 'https://www.imperial.ac.uk/study' },
  { externalId: 'uk-manchester', name: 'University of Manchester', country: 'UK', majorTags: ['computer_science', 'business'], avgTuition: 29000, admissionRate: 0.56, note: 'https://www.manchester.ac.uk' },
  { externalId: 'ca-toronto', name: 'University of Toronto', country: 'Canada', majorTags: ['computer_science', 'engineering'], avgTuition: 45000, admissionRate: 0.43, note: 'https://www.utoronto.ca' },
  { externalId: 'ca-ubc', name: 'University of British Columbia', country: 'Canada', majorTags: ['computer_science', 'business'], avgTuition: 41000, admissionRate: 0.52, note: 'https://you.ubc.ca' },
  { externalId: 'ca-mcgill', name: 'McGill University', country: 'Canada', majorTags: ['economics', 'law'], avgTuition: 38000, admissionRate: 0.46, note: 'https://www.mcgill.ca' },
  { externalId: 'au-melbourne', name: 'University of Melbourne', country: 'Australia', majorTags: ['computer_science', 'business'], avgTuition: 33000, admissionRate: 0.7, note: 'https://study.unimelb.edu.au' },
  { externalId: 'au-sydney', name: 'University of Sydney', country: 'Australia', majorTags: ['engineering', 'business'], avgTuition: 34000, admissionRate: 0.68, note: 'https://www.sydney.edu.au' },
  { externalId: 'au-anu', name: 'Australian National University', country: 'Australia', majorTags: ['computer_science', 'economics'], avgTuition: 35000, admissionRate: 0.35, note: 'https://www.anu.edu.au' },
  { externalId: 'eu-tudelft', name: 'TU Delft', country: 'Netherlands', majorTags: ['engineering', 'computer_science'], avgTuition: 18000, admissionRate: 0.5, note: 'https://www.tudelft.nl' },
  { externalId: 'eu-eth', name: 'ETH Zurich', country: 'Switzerland', majorTags: ['computer_science', 'engineering'], avgTuition: 1500, admissionRate: 0.27, note: 'https://ethz.ch' },
  { externalId: 'eu-lmu', name: 'LMU Munich', country: 'Germany', majorTags: ['economics', 'business'], avgTuition: 0, admissionRate: 0.4, note: 'https://www.lmu.de' },
];

export async function seedManualSchools() {
  for (const school of MANUAL_SCHOOLS) {
    await upsertSchoolFromSource({
      source: 'manual_curated',
      externalId: school.externalId,
      name: school.name,
      country: school.country,
      majorTags: school.majorTags,
      avgTuition: school.avgTuition,
      admissionRate: school.admissionRate,
      medianEarnings: null,
      completionRate: null,
      // `note` has always been each school's real official site (spot-checked when this row
      // was curated) — now also promoted to websiteUrl so match cards can link straight to it,
      // the same as college_scorecard's school.school_url does for US schools.
      websiteUrl: school.note,
      rawSourceData: { note: school.note },
    });
  }
  logger.info('Seeded manually curated schools', { count: MANUAL_SCHOOLS.length });
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedManualSchools()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
