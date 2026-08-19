// Visa requirements moved from a per (home_country, destination_country) pair to a general
// checklist per destination_country. The per-nationality data model implied a level of
// personalization ("India -> US" vs "China -> UK") that the underlying content never
// actually delivered on — the checklists were general destination requirements from each
// destination's own official site, not nationality-specific rules. Keeping the fake pairing
// meant most home/destination combinations returned VISA_DATA_UNAVAILABLE even when a
// perfectly good general checklist for that destination existed. See DATA_SOURCES.md.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    DELETE FROM visa_requirements;
    ALTER TABLE visa_requirements DROP CONSTRAINT visa_requirements_home_country_destination_country_key;
    ALTER TABLE visa_requirements DROP COLUMN home_country;
    ALTER TABLE visa_requirements ADD CONSTRAINT visa_requirements_destination_country_key UNIQUE (destination_country);
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DELETE FROM visa_requirements;
    ALTER TABLE visa_requirements DROP CONSTRAINT visa_requirements_destination_country_key;
    ALTER TABLE visa_requirements ADD COLUMN home_country TEXT NOT NULL DEFAULT 'unknown';
    ALTER TABLE visa_requirements ALTER COLUMN home_country DROP DEFAULT;
    ALTER TABLE visa_requirements ADD CONSTRAINT visa_requirements_home_country_destination_country_key UNIQUE (home_country, destination_country);
  `);
}
