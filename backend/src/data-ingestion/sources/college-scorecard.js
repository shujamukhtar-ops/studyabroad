import { env } from '../../config/env.js';

const BASE_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools';

// Scorecard has no per-school major/CIP list in a single cheap field, but
// latest.academics.program_percentage.* gives the share of degrees a school awards in each
// of ~35 broad CIP categories. Mapping a subset of those onto the same major_tags vocabulary
// already used by the manually curated schools (see seed-schools-manual.js) is inexact —
// it's a "notable share of degrees in this area" signal, not "this school has a computer
// science department" — but it's real, sourced data rather than an invented tag, which is
// what ARCHITECTURE.md §7 requires. There's no Scorecard category corresponding to
// "economics" specifically (it's folded into the broader "social_science" CIP group, which
// is too broad to tag accurately), so economics-tagged matches remain manual_curated-only.
const PROGRAM_PERCENTAGE_FIELDS = [
  'latest.academics.program_percentage.computer',
  'latest.academics.program_percentage.engineering',
  'latest.academics.program_percentage.engineering_technology',
  'latest.academics.program_percentage.business_marketing',
  'latest.academics.program_percentage.legal',
];
const MAJOR_TAG_THRESHOLD = 0.02; // >=2% of a school's degrees awarded in that CIP category

const FIELDS = [
  'id',
  'school.name',
  'school.state',
  'school.school_url',
  'school.price_calculator_url',
  'latest.cost.tuition.out_of_state',
  'latest.admissions.admission_rate.overall',
  'latest.earnings.10_yrs_after_entry.median',
  'latest.completion.completion_rate_4yr_150nt',
  ...PROGRAM_PERCENTAGE_FIELDS,
].join(',');

// Scorecard returns bare domains with no protocol for many schools (e.g. "www.princeton.edu/")
// and a full https:// URL for others — normalizing here means every consumer of websiteUrl/
// netPriceCalculatorUrl gets a link that actually opens, never a browser treating "www.x.edu"
// as a relative path on this app's own domain.
function normalizeUrl(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const PAGE_SIZE = 100;

function deriveMajorTags(record) {
  const tags = [];
  const computer = record['latest.academics.program_percentage.computer'] ?? 0;
  const engineering = Math.max(
    record['latest.academics.program_percentage.engineering'] ?? 0,
    record['latest.academics.program_percentage.engineering_technology'] ?? 0
  );
  const business = record['latest.academics.program_percentage.business_marketing'] ?? 0;
  const legal = record['latest.academics.program_percentage.legal'] ?? 0;

  if (computer >= MAJOR_TAG_THRESHOLD) tags.push('computer_science');
  if (engineering >= MAJOR_TAG_THRESHOLD) tags.push('engineering');
  if (business >= MAJOR_TAG_THRESHOLD) tags.push('business');
  if (legal >= MAJOR_TAG_THRESHOLD) tags.push('law');
  return tags;
}

// Pure — no I/O — so Phase 4 tests can feed it a saved fixture response without hitting
// the network. See DATA_SOURCES.md for the field mapping this implements.
export function mapRecordToSchool(record) {
  return {
    source: 'college_scorecard',
    externalId: String(record.id),
    name: record['school.name'],
    country: 'US',
    majorTags: deriveMajorTags(record),
    avgTuition: record['latest.cost.tuition.out_of_state'] ?? null,
    admissionRate: record['latest.admissions.admission_rate.overall'] ?? null,
    medianEarnings: record['latest.earnings.10_yrs_after_entry.median'] ?? null,
    completionRate: record['latest.completion.completion_rate_4yr_150nt'] ?? null,
    websiteUrl: normalizeUrl(record['school.school_url']),
    netPriceCalculatorUrl: normalizeUrl(record['school.price_calculator_url']),
    rawSourceData: record,
  };
}

async function fetchPage(page) {
  const url = new URL(BASE_URL);
  url.searchParams.set('api_key', env.collegeScorecardApiKey);
  url.searchParams.set('fields', FIELDS);
  url.searchParams.set('per_page', String(PAGE_SIZE));
  url.searchParams.set('page', String(page));
  // Restrict to schools that predominantly award bachelor's (3) or graduate (4) degrees,
  // and are still operating — otherwise "matches" surface certificate/associate's-degree
  // trade schools and closed institutions alongside universities, which isn't a useful
  // pool for this product's international-applicant audience.
  url.searchParams.set('school.degrees_awarded.predominant__range', '3..4');
  url.searchParams.set('school.operating', '1');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`College Scorecard API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetches every page of the College Scorecard schools endpoint and yields mapped
 * school records. `maxPages` guards against runaway pagination in dev/testing.
 */
export async function* fetchAllSchools({ maxPages = Infinity } = {}) {
  let page = 0;
  while (page < maxPages) {
    const body = await fetchPage(page);
    const results = body.results ?? [];
    for (const record of results) {
      yield mapRecordToSchool(record);
    }

    const totalFetched = (page + 1) * PAGE_SIZE;
    if (results.length < PAGE_SIZE || totalFetched >= (body.metadata?.total ?? 0)) {
      break;
    }
    page += 1;
  }
}
