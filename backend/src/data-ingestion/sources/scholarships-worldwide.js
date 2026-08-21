import fs from 'node:fs';

// This archive's `location` field turns out not to reliably mean "destination country" —
// e.g. one entry titled "...Scholarships...in Germany" is tagged under all 8 of the
// dataset's location buckets (europe, south-africa, nigeria, pakistan, india, canada,
// united-states, united-kingdom) at once, which only makes sense if `location` sometimes
// means "which regional page of the source site this was scraped from" (an audience/
// nationality grouping) rather than "where you'd study." A user this app tells "this funds
// study in Canada" needs that to actually be true, so this only imports a location tag when
// it's the *only* location that title was ever scraped under across the full dataset —
// single-location entries are verifiably specific (checked against real institution names
// like Brock University, CalArts, Strathclyde), multi-location ones aren't trustworthy for
// destination-country purposes and are dropped rather than guessed at.
const LOCATION_TO_COUNTRY = {
  canada: 'Canada',
  'united-kingdom': 'UK',
  'united-states': 'US',
};

// A second, independent safety net: if the title itself names a *different* country than the
// one `location` assigned, trust the title and drop the row rather than risk a wrong tag.
const OTHER_COUNTRY_TITLE_MARKERS = {
  US: [/\bin (the )?usa\b/, /\bin (the )?united states\b/],
  UK: [/\bin (the )?uk\b/, /\bin (the )?united kingdom\b/, /\bin britain\b/],
  Canada: [/\bin canada\b/],
  Germany: [/\bin germany\b/],
  Australia: [/\bin australia\b/],
  Netherlands: [/\bin (the )?netherlands\b/],
  Switzerland: [/\bin switzerland\b/],
};

const STALE_DEADLINE_CUTOFF_YEAR = 2026; // see ingestion note below

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Returns { deadline: 'YYYY-MM-DD' | null, keep: boolean }. A concrete past-dated deadline
// (this archive is dominated by leftover 2022/2023 entries) means the scholarship is
// definitionally expired and shouldn't be imported at all — importing hundreds of dead rows
// that can never match anything just bloats the table for no benefit, unlike a rolling/
// unstated deadline ("N/A", "Always Active", ...), which is still genuinely offerable today
// and is imported with deadline: null (open-ended, same convention as the manually curated
// scholarships).
function resolveDeadline(raw) {
  const yearMatch = String(raw ?? '').match(/(20\d{2})/);
  if (!yearMatch) return { deadline: null, keep: true };

  const year = Number(yearMatch[1]);
  if (year < STALE_DEADLINE_CUTOFF_YEAR) return { deadline: null, keep: false };

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { deadline: null, keep: true };
  return { deadline: parsed.toISOString().slice(0, 10), keep: true };
}

// Best-effort leading currency amount ("$1000", "Up to $10,000", "£10,000 per annum" -> a
// number) for the sortable `amount` column; the full original text is always kept separately
// as `amountText` for display, since most awards ("Full tuition fees coverage", "50%
// scholarship") aren't reducible to a single number at all.
function extractAmount(awardText) {
  const match = String(awardText ?? '').match(/[$£€]\s?([\d,]+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

// This archive's `eligibility` field is a comma-separated list drawn from a fixed small
// vocabulary ("Phd", "Bachelor", "Master", "Course", plus a handful of rows where a funding
// *status* — "Not Funded", "Fully Funded" — leaked into this field instead of an actual
// eligibility value). Only Bachelor/Master/Phd map onto this app's degreeLevels vocabulary
// (profiles.degree_level: undergraduate/graduate/phd); "Course" (a non-degree short course,
// not one of this app's three modeled degree levels) and anything else unrecognized are
// deliberately not extracted into a tag, same as this file's existing majorTags: [] choice —
// resulting in degreeLevels: [] (this app's "open to all" convention) rather than a guessed
// restriction. That does mean a Course-only row still surfaces for every degree level rather
// than none, which is the same "don't guess an exclusion the data doesn't state" tradeoff the
// eligibleNationalities/majorTags columns already make for this archive.
const ELIGIBILITY_TO_DEGREE_LEVEL = [
  [/\bbachelor\b/i, 'undergraduate'],
  [/\bmaster\b/i, 'graduate'],
  [/\bphd\b/i, 'phd'],
];

function extractDegreeLevels(eligibilityText) {
  const text = String(eligibilityText ?? '');
  const levels = ELIGIBILITY_TO_DEGREE_LEVEL.filter(([pattern]) => pattern.test(text)).map(([, level]) => level);
  return [...new Set(levels)];
}

export function parseScholarshipsWorldwide(raw) {
  const { scholarships } = JSON.parse(raw);

  const locationsByTitle = new Map();
  for (const row of scholarships) {
    const set = locationsByTitle.get(row.title) ?? new Set();
    set.add(row.location);
    locationsByTitle.set(row.title, set);
  }

  const results = [];
  const seenTitles = new Set();

  for (const row of scholarships) {
    const country = LOCATION_TO_COUNTRY[row.location];
    if (!country) continue;
    if (seenTitles.has(row.title)) continue; // single-location titles are unique already; guards re-processing regardless

    const allLocationsForTitle = locationsByTitle.get(row.title);
    if (allLocationsForTitle.size > 1) continue; // cross-posted -> not a trustworthy destination tag

    const titleLower = row.title.toLowerCase();
    const conflictsWithTitle = Object.entries(OTHER_COUNTRY_TITLE_MARKERS).some(
      ([markerCountry, patterns]) => markerCountry !== country && patterns.some((p) => p.test(titleLower))
    );
    if (conflictsWithTitle) continue;

    const { deadline, keep } = resolveDeadline(row.deadline);
    if (!keep) continue;

    seenTitles.add(row.title);
    results.push({
      source: 'scraped_archive',
      externalId: slugify(row.title),
      name: row.title,
      destinationCountries: [country],
      eligibleNationalities: [], // not reliably derivable from this archive — see module comment
      degreeLevels: extractDegreeLevels(row.eligibility),
      majorTags: [], // ditto; eligibilityNote carries the freeform detail instead of a guessed tag
      amount: extractAmount(row.award),
      amountText: row.award === 'N/A' ? null : row.award,
      eligibilityNote: row.eligibility === 'N/A' ? null : row.eligibility,
      deadline,
      sourceUrl: row.url === 'N/A' ? null : row.url,
    });
  }

  return results;
}

export function loadScholarshipsWorldwide(filePath) {
  return parseScholarshipsWorldwide(fs.readFileSync(filePath, 'utf8'));
}
