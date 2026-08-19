// The canonical major-tag vocabulary used across manual_curated seed data, the College
// Scorecard major-tag derivation (see data-ingestion/sources/college-scorecard.js), and
// scholarship eligibility tags. A profile's intended_major must be one of these — not
// freeform text — or it can never match a school/scholarship's major_tags array (a real
// bug in the original freeform-text version: "Computer Science" never equals the tag
// "computer_science" in a Postgres array containment check).
export const MAJOR_TAGS = [
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'business', label: 'Business' },
  { value: 'economics', label: 'Economics' },
  { value: 'law', label: 'Law' },
];

export const MAJOR_TAG_VALUES = MAJOR_TAGS.map((m) => m.value);
