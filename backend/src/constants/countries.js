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

// The visa checklist's destination field (VisaPage.jsx) is free text, not a dropdown like
// target_countries — a student searching for a checklist reasonably expects "United Kingdom",
// "UK", and "U.K." to mean the same destination, even though only one exact string
// (COUNTRIES' `value`) is what visa_requirements.destination_country and schools.country
// actually store for lookup. This maps any recognized spelling/abbreviation back to that
// canonical value so the lookup isn't just an exact-string match against a key nobody types
// unprompted. Deliberately generous (common demonyms/abbreviations included, not just each
// country's own `label`) rather than exhaustive — an unrecognized destination still falls
// through unchanged to the caller, which already handles "no curated data for this
// destination" as VISA_DATA_UNAVAILABLE (see visaService.js) rather than guessing.
const COUNTRY_ALIASES = {
  US: ['us', 'usa', 'u.s.', 'u.s.a.', 'united states', 'united states of america', 'america'],
  UK: ['uk', 'u.k.', 'united kingdom', 'britain', 'great britain', 'england', 'scotland', 'wales', 'northern ireland'],
  Canada: ['canada', 'ca'],
  Australia: ['australia', 'au', 'aus'],
  Netherlands: ['netherlands', 'the netherlands', 'nl', 'holland'],
  Switzerland: ['switzerland', 'ch', 'swiss confederation'],
  Germany: ['germany', 'de', 'deutschland'],
};

const ALIAS_TO_CANONICAL = Object.fromEntries(
  COUNTRIES.flatMap(({ value, label }) =>
    [...(COUNTRY_ALIASES[value] ?? []), value, label].map((alias) => [alias.trim().toLowerCase(), value])
  )
);

// Returns the canonical COUNTRIES value for any recognized spelling/case/whitespace variant
// of a country name, or null if nothing matches (an unsupported destination, or gibberish).
export function normalizeCountryInput(raw) {
  if (typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return ALIAS_TO_CANONICAL[key] ?? null;
}

export const DEGREE_LEVELS = [
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: "Graduate / Master's" },
  { value: 'phd', label: 'PhD' },
];

export const DEGREE_LEVEL_VALUES = DEGREE_LEVELS.map((d) => d.value);
