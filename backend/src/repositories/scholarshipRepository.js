import { query } from './db.js';

export async function findCandidateScholarships({ nationality, intendedMajor, targetCountries }) {
  const { rows } = await query(
    `SELECT * FROM scholarships
     WHERE (cardinality(eligible_nationalities) = 0 OR $1::text = ANY(eligible_nationalities))
       AND ($2::text IS NULL OR cardinality(major_tags) = 0 OR $2::text = ANY(major_tags))
       AND ($3::text[] IS NULL OR cardinality($3::text[]) = 0 OR cardinality(destination_countries) = 0
            OR destination_countries && $3::text[])
       AND (deadline IS NULL OR deadline >= CURRENT_DATE)
     ORDER BY
       CASE WHEN $3::text[] IS NOT NULL AND cardinality($3::text[]) > 0
              AND destination_countries && $3::text[] THEN 0 ELSE 1 END,
       amount DESC NULLS LAST
     LIMIT 100`,
    [nationality ?? null, intendedMajor ?? null, targetCountries ?? []]
  );
  return rows;
}

// The (source, external_id) partial-unique index (see migration
// 1700000010000_scholarships-destination-country.js) is what makes this safe to re-run: a
// 'scraped_archive' import can only ever conflict with — and overwrite — other
// scraped_archive rows sharing the same external_id, never a manual_curated one, mirroring
// upsertSchoolFromSource's guarantee in repositories/schoolRepository.js. Rows with no
// external_id (the original hand-entered scholarships, before this column existed) fall
// outside that partial index entirely and always insert fresh — callers that want upsert
// semantics must pass an externalId.
export async function upsertScholarship(record) {
  const {
    source,
    externalId,
    name,
    eligibleNationalities,
    destinationCountries,
    majorTags,
    amount,
    amountText,
    eligibilityNote,
    deadline,
    sourceUrl,
    verifiedBy,
  } = record;

  if (!externalId) {
    const { rows } = await query(
      `INSERT INTO scholarships
         (source, name, eligible_nationalities, destination_countries, major_tags, amount, amount_text,
          eligibility_note, deadline, source_url, verified_at, verified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $11::text IS NOT NULL THEN now() ELSE NULL END, $11)
       RETURNING *`,
      [
        source,
        name,
        eligibleNationalities ?? [],
        destinationCountries ?? [],
        majorTags ?? [],
        amount,
        amountText ?? null,
        eligibilityNote ?? null,
        deadline,
        sourceUrl,
        verifiedBy ?? null,
      ]
    );
    return rows[0];
  }

  const { rows } = await query(
    `INSERT INTO scholarships
       (source, external_id, name, eligible_nationalities, destination_countries, major_tags, amount,
        amount_text, eligibility_note, deadline, source_url, verified_at, verified_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CASE WHEN $12::text IS NOT NULL THEN now() ELSE NULL END, $12)
     ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
       name = EXCLUDED.name,
       eligible_nationalities = EXCLUDED.eligible_nationalities,
       destination_countries = EXCLUDED.destination_countries,
       major_tags = EXCLUDED.major_tags,
       amount = EXCLUDED.amount,
       amount_text = EXCLUDED.amount_text,
       eligibility_note = EXCLUDED.eligibility_note,
       deadline = EXCLUDED.deadline,
       source_url = EXCLUDED.source_url
     RETURNING *`,
    [
      source,
      externalId,
      name,
      eligibleNationalities ?? [],
      destinationCountries ?? [],
      majorTags ?? [],
      amount,
      amountText ?? null,
      eligibilityNote ?? null,
      deadline,
      sourceUrl,
      verifiedBy ?? null,
    ]
  );
  return rows[0];
}

// Kept for the original 10 hand-curated rows (seed-scholarships.js), which never had an
// external_id before this table supported upsert semantics — thin wrapper so that call site
// doesn't need to know about the insert/upsert split.
export async function insertScholarship(record) {
  return upsertScholarship(record);
}
