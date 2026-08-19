-- StudyAbroad schema
-- Target: PostgreSQL 14+
-- Note: this file documents the intended shape for Phase 1 review.
-- Phase 2 will translate this into versioned migrations (see RISK_NOTES.md
-- for the migration-tool decision), not run this file directly against prod.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    home_country    TEXT NOT NULL,  -- drives scholarship nationality-eligibility
    tier            TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'premium')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    target_countries    TEXT[] NOT NULL DEFAULT '{}',
    intended_major      TEXT,
    target_intake       TEXT,               -- e.g. 'Fall 2027'
    budget_range        TEXT CHECK (budget_range IN ('<15k', '15-30k', '30-50k', '50k+')),
    gpa                 NUMERIC(3,2),
    test_scores         JSONB NOT NULL DEFAULT '{}',  -- e.g. {"toefl":110,"gre":{"quant":165}}
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Fixed to 'essay' — statement of purpose and essay were never a meaningful distinction
    -- in this product (same review flow, same rubric), and transcripts were never actually
    -- analyzed differently despite once being a listed type. See migration
    -- 1700000003000_documents-single-type.js.
    type                TEXT NOT NULL DEFAULT 'essay' CHECK (type = 'essay'),
    -- Which rubric this document's feedback was graded against (see ai-engine/sopRubric.js
    -- ESSAY_RUBRICS) — 'general' is the app's original single rubric and the default; the
    -- other six mirror rubrics published at https://gradpilot.com/rubrics. See migration
    -- 1700000005000_documents-essay-type.js.
    essay_type          TEXT NOT NULL DEFAULT 'general'
                            CHECK (essay_type IN ('general', 'undergraduate', 'graduate', 'phd', 'uk_undergraduate', 'scholarship', 'fellowship')),
    raw_text            TEXT NOT NULL,  -- extracted text, whether pasted directly or parsed from an uploaded file
    original_filename   TEXT,           -- null unless uploaded as a file (.pdf, .docx, .txt, .md)
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

-- Baseline accepted/rejected essays used for Stage 2 few-shot retrieval (RAG): the
-- student's essay is embedded and the nearest examples for their intended_major are
-- pulled in as grounding context for analyzePersonalized. 1024 dims matches Amazon Titan
-- Text Embeddings V2 (Bedrock) — see backend/src/ai-engine/embeddingProvider.js. See
-- migration 1700000004000_add-essay-examples-vector.js.
CREATE TABLE essay_examples (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intended_major  TEXT NOT NULL,
    outcome         TEXT NOT NULL CHECK (outcome IN ('accepted', 'rejected')),
    text            TEXT NOT NULL,
    notes           TEXT NOT NULL,
    embedding       vector(1024)
);
CREATE INDEX idx_essay_examples_embedding ON essay_examples USING hnsw (embedding vector_cosine_ops);

CREATE TABLE schools (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source              TEXT NOT NULL CHECK (source IN ('college_scorecard', 'hesa_discover_uni', 'manual_curated')),
    external_id         TEXT,               -- source's own id, e.g. Scorecard's `id` field
    name                TEXT NOT NULL,
    country             TEXT NOT NULL,
    major_tags          TEXT[] NOT NULL DEFAULT '{}',
    avg_tuition         NUMERIC,
    admission_rate      NUMERIC,
    median_earnings     NUMERIC,
    completion_rate     NUMERIC,
    raw_source_data     JSONB,              -- full source payload, for audit/debug
    last_synced_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- embedding vector(1536),  -- pgvector seam, deliberately commented out (see note above)
    UNIQUE (source, external_id)
);
CREATE INDEX idx_schools_country ON schools(country);
CREATE INDEX idx_schools_major_tags ON schools USING GIN (major_tags);

CREATE TABLE scholarships (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source                      TEXT NOT NULL CHECK (source IN ('manual_curated', 'partner_api')),
    name                        TEXT NOT NULL,
    eligible_nationalities      TEXT[] NOT NULL DEFAULT '{}',   -- empty = open to all
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

-- Deliberately NOT scraped or LLM-generated. Manually curated/reviewed only.
-- One general checklist per destination, sourced from that destination's own official
-- immigration site — not personalized per applicant nationality (see migration
-- 1700000001000_visa-requirements-general.js for why the earlier per-home-country
-- design was dropped).
CREATE TABLE visa_requirements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_country TEXT NOT NULL,
    checklist_json      JSONB NOT NULL,
    source_url          TEXT,
    last_reviewed_at    TIMESTAMPTZ,
    reviewed_by         TEXT,
    UNIQUE (destination_country)
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
