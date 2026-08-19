// This migration's SQL body is the versioned copy of ../../schema.sql (repo root),
// which stays as the human-readable reference doc from Phase 1. If the schema changes,
// add a NEW migration here rather than editing this file or schema.sql after it has run
// anywhere — see README.md "Database migrations".

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email           TEXT NOT NULL UNIQUE,
        password_hash   TEXT NOT NULL,
        home_country    TEXT NOT NULL,
        tier            TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'premium')),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE profiles (
        user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        target_countries    TEXT[] NOT NULL DEFAULT '{}',
        intended_major      TEXT,
        target_intake       TEXT,
        budget_range        TEXT CHECK (budget_range IN ('<15k', '15-30k', '30-50k', '50k+')),
        gpa                 NUMERIC(3,2),
        test_scores         JSONB NOT NULL DEFAULT '{}',
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE documents (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type                TEXT NOT NULL CHECK (type IN ('sop', 'essay', 'transcript')),
        raw_text            TEXT NOT NULL,
        uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        tier_at_analysis    TEXT NOT NULL CHECK (tier_at_analysis IN ('basic', 'premium'))
    );
    CREATE INDEX idx_documents_user_id ON documents(user_id);

    CREATE TABLE feedback (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        stage           TEXT NOT NULL CHECK (stage IN ('structural', 'personalized')),
        analysis_json   JSONB NOT NULL,
        model_version   TEXT NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_feedback_document_id ON feedback(document_id);

    CREATE TABLE schools (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source              TEXT NOT NULL CHECK (source IN ('college_scorecard', 'hesa_discover_uni', 'manual_curated')),
        external_id         TEXT,
        name                TEXT NOT NULL,
        country             TEXT NOT NULL,
        major_tags          TEXT[] NOT NULL DEFAULT '{}',
        avg_tuition         NUMERIC,
        admission_rate      NUMERIC,
        median_earnings     NUMERIC,
        completion_rate     NUMERIC,
        raw_source_data     JSONB,
        last_synced_at      TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (source, external_id)
    );
    CREATE INDEX idx_schools_country ON schools(country);
    CREATE INDEX idx_schools_major_tags ON schools USING GIN (major_tags);

    CREATE TABLE scholarships (
        id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source                      TEXT NOT NULL CHECK (source IN ('manual_curated', 'partner_api')),
        name                        TEXT NOT NULL,
        eligible_nationalities      TEXT[] NOT NULL DEFAULT '{}',
        major_tags                  TEXT[] NOT NULL DEFAULT '{}',
        amount                      NUMERIC,
        deadline                    DATE,
        source_url                  TEXT,
        verified_at                 TIMESTAMPTZ,
        verified_by                 TEXT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_scholarships_nationalities ON scholarships USING GIN (eligible_nationalities);
    CREATE INDEX idx_scholarships_major_tags ON scholarships USING GIN (major_tags);

    CREATE TABLE visa_requirements (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        home_country        TEXT NOT NULL,
        destination_country TEXT NOT NULL,
        checklist_json      JSONB NOT NULL,
        source_url          TEXT,
        last_reviewed_at    TIMESTAMPTZ,
        reviewed_by         TEXT,
        UNIQUE (home_country, destination_country)
    );

    CREATE TABLE match_results (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        score           NUMERIC NOT NULL,
        reasoning_text  TEXT,
        model_version   TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, school_id)
    );
    CREATE INDEX idx_match_results_user_id ON match_results(user_id);

    CREATE TABLE data_sync_log (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source              TEXT NOT NULL,
        started_at          TIMESTAMPTZ NOT NULL,
        completed_at        TIMESTAMPTZ,
        records_processed   INTEGER NOT NULL DEFAULT 0,
        records_failed      INTEGER NOT NULL DEFAULT 0,
        status              TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')) DEFAULT 'running'
    );
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS data_sync_log;
    DROP TABLE IF EXISTS match_results;
    DROP TABLE IF EXISTS visa_requirements;
    DROP TABLE IF EXISTS scholarships;
    DROP TABLE IF EXISTS schools;
    DROP TABLE IF EXISTS feedback;
    DROP TABLE IF EXISTS documents;
    DROP TABLE IF EXISTS profiles;
    DROP TABLE IF EXISTS users;
  `);
}
