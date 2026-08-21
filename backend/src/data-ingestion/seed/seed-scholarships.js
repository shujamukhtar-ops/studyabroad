import { upsertScholarship } from '../../repositories/scholarshipRepository.js';
import { logger } from '../../logging/logger.js';

// Placeholder curated rows, source_url populated so each can be re-verified before launch.
// eligibleNationalities: [] means open to all nationalities. destinationCountries: [] means
// not tied to one of this app's supported destinations (Schwarzman funds study at Tsinghua
// in China; Rotary Peace Fellowships run at several Peace Centers across multiple countries)
// — left empty rather than guessed, per ARCHITECTURE.md §7's provenance rule, so it still
// surfaces for any search instead of being mistagged to a country it doesn't fund.
//
// degreeLevels: [] means open to all degree levels (same convention). Each one below was
// checked against its own sourceUrl (or, where the homepage didn't have granular eligibility
// text, a search of that program's own published eligibility criteria) rather than assumed —
// per ARCHITECTURE.md §7, August 2026:
//   - Fulbright Foreign Student Program: master's and doctoral programs, not undergraduate
//     (foreign.fulbrightonline.org/about/foreign-student-program).
//   - Chevening: "a one-year master's degree at any UK university" — master's only, and
//     explicitly requires the applicant already hold an undergraduate degree.
//   - Vanier Canada Graduate Scholarship: "registered in a full-time doctoral program" —
//     PhD only (vanier.gc.ca/en/eligibility-admissibilite.html).
//   - Australia Awards: "Undergraduate, postgraduate and vocational courses are all
//     acceptable" — genuinely open to every degree level this app models, so left empty
//     rather than listed, same as any other scholarship with no degree-level restriction.
//   - DAAD Study Scholarship: the flagship generic DAAD "Study Scholarships for Graduates of
//     All Disciplines" program is master's-only ("pursue a full Master's degree... Applicants
//     must have completed their first university degree").
//   - Commonwealth Scholarship: master's and PhD tracks only — requires an undergraduate
//     degree (or near-completion) as a prerequisite, so not itself undergraduate-eligible.
//   - Schwarzman Scholars: "a prestigious one-year, fully funded master's program" — master's
//     only.
//   - Knight-Hennessy Scholars: funds "any of Stanford's graduate degree programs" (MA, MBA,
//     MD, MS, PhD, etc.) — master's/professional and doctoral, not undergraduate.
//   - ETH Excellence Scholarship (ESOP): "a merit-based award for Master's students at ETH
//     Zurich" — master's only.
//   - Rotary Peace Fellowship: a master's-degree track plus a non-degree professional
//     certificate track (not modeled as a degree level in this app) — no doctoral track, so
//     tagged master's ('graduate') only.
const SCHOLARSHIPS = [
  { externalId: 'fulbright-us', name: 'Fulbright Foreign Student Program', eligibleNationalities: [], destinationCountries: ['US'], degreeLevels: ['graduate', 'phd'], majorTags: [], amount: 40000, deadline: '2027-05-01', sourceUrl: 'https://foreign.fulbrightonline.org' },
  { externalId: 'chevening-uk', name: 'Chevening Scholarship (UK)', eligibleNationalities: [], destinationCountries: ['UK'], degreeLevels: ['graduate'], majorTags: [], amount: 35000, deadline: '2026-11-02', sourceUrl: 'https://www.chevening.org' },
  { externalId: 'vanier-canada', name: 'Vanier Canada Graduate Scholarship', eligibleNationalities: [], destinationCountries: ['Canada'], degreeLevels: ['phd'], majorTags: [], amount: 50000, deadline: '2026-11-03', sourceUrl: 'https://vanier.gc.ca' },
  { externalId: 'australia-awards', name: 'Australia Awards Scholarship', eligibleNationalities: [], destinationCountries: ['Australia'], degreeLevels: [], majorTags: [], amount: 30000, deadline: '2027-04-30', sourceUrl: 'https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships' },
  { externalId: 'daad-germany', name: 'DAAD Study Scholarship (Germany)', eligibleNationalities: [], destinationCountries: ['Germany'], degreeLevels: ['graduate'], majorTags: [], amount: 15000, deadline: '2026-10-15', sourceUrl: 'https://www.daad.de' },
  // The CSC's Commonwealth Scholarship funds Commonwealth-nationality students to study in
  // the UK specifically — the eligibility axis (nationality) and the destination axis
  // (country funded) are genuinely different values here, which is exactly why the two are
  // now separate columns instead of one overloaded "country" field.
  { externalId: 'commonwealth', name: 'Commonwealth Scholarship', eligibleNationalities: ['India', 'Pakistan', 'Bangladesh', 'Nigeria', 'Kenya'], destinationCountries: ['UK'], degreeLevels: ['graduate', 'phd'], majorTags: [], amount: 28000, deadline: '2026-12-15', sourceUrl: 'https://cscuk.fcdo.gov.uk' },
  { externalId: 'schwarzman', name: 'Schwarzman Scholars', eligibleNationalities: [], destinationCountries: [], degreeLevels: ['graduate'], majorTags: ['business', 'economics'], amount: 60000, deadline: '2026-09-27', sourceUrl: 'https://www.schwarzmanscholars.org' },
  { externalId: 'knight-hennessy-us', name: 'Knight-Hennessy Scholars', eligibleNationalities: [], destinationCountries: ['US'], degreeLevels: ['graduate', 'phd'], majorTags: [], amount: 80000, deadline: '2026-10-08', sourceUrl: 'https://knight-hennessy.stanford.edu' },
  { externalId: 'eth-excellence-switzerland', name: 'ETH Excellence Scholarship', eligibleNationalities: [], destinationCountries: ['Switzerland'], degreeLevels: ['graduate'], majorTags: ['computer_science', 'engineering'], amount: 12000, deadline: '2026-12-15', sourceUrl: 'https://ethz.ch/en/studies/master/application/financial/excellence-scholarship.html' },
  { externalId: 'rotary-peace-fellowship', name: 'Rotary Peace Fellowship', eligibleNationalities: [], destinationCountries: [], degreeLevels: ['graduate'], majorTags: ['economics', 'law'], amount: 25000, deadline: '2027-05-15', sourceUrl: 'https://www.rotary.org/en/our-programs/peace-fellowships' },
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
