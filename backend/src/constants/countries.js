// The fixed target-country vocabulary. Previously targetCountries accepted any freeform
// string, which meant a typo like "United States" instead of "US" would silently never match
// a single school (schoolRepository.findCandidateSchools does an exact string comparison
// against schools.country) with no validation error to explain why. Constraining it to the
// countries actually present in the school/scholarship seed data (see
// data-ingestion/seed/seed-schools-manual.js and sources/college-scorecard.js, which only
// ever writes country: 'US') turns that silent failure into an honest, enforced list, and
// gives the standardized-test-recommendation feature (constants/testRecommendations.js) a
// closed set of keys to look up against.
export const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Netherlands', label: 'Netherlands' },
  { value: 'Switzerland', label: 'Switzerland' },
  { value: 'Germany', label: 'Germany' },
];

export const COUNTRY_VALUES = COUNTRIES.map((c) => c.value);

export const DEGREE_LEVELS = [
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: "Graduate / Master's" },
  { value: 'phd', label: 'PhD' },
];

export const DEGREE_LEVEL_VALUES = DEGREE_LEVELS.map((d) => d.value);
