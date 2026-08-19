# StudyAbroad

Full-stack app for international students applying to universities abroad: profile-based essay
feedback, school/scholarship matching, and visa guidance, gated by a basic/premium tier.

See [ARCHITECTURE.md](ARCHITECTURE.md), [schema.sql](schema.sql), [DATA_SOURCES.md](DATA_SOURCES.md),
[API_SPEC.md](API_SPEC.md), and [RISK_NOTES.md](RISK_NOTES.md) for the Phase 1 design docs this
build follows. [TESTING.md](TESTING.md) covers what's tested and how to run the suite.

## Prerequisites

- Node.js 20+
- Docker (for the local Postgres instance) — or your own Postgres 14+ if you'd rather not use Docker

## Setup

```bash
# 1. Start a local Postgres (host port 5433, to avoid clashing with a system-wide Postgres on 5432)
cd backend
docker compose up -d

# 2. Configure env vars
cp .env.example .env
# Edit .env: set a real JWT_SECRET (the app fails fast on the placeholder "changeme").
# DATABASE_URL in .env.example already points at the docker-compose Postgres.

# 3. Install and migrate
npm install
npm run migrate:up

# 4. Seed data
npm run seed          # manually curated non-US schools, scholarships, visa placeholders
npm run sync:schools   # pulls ~current US schools from the College Scorecard API (DEMO_KEY works)

# 5. Run the backend
npm run dev            # http://localhost:4000
```

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env   # only needed if the backend isn't on the default proxied port
npm run dev             # http://localhost:5173, proxies /api to the backend
```

## Database migrations

Migrations live in `backend/migrations/`, run via [node-pg-migrate](https://github.com/salsita/node-pg-migrate).
`schema.sql` at the repo root is the human-readable reference copy from Phase 1 planning — the
migration file is the actual source of truth once it has run anywhere. To change the schema, add
a **new** migration; don't edit `1700000000000_init-schema.js` after it has been applied.

```bash
cd backend
npm run migrate:up      # apply pending migrations
npm run migrate:down    # roll back the most recent migration
```

## Running tests

```bash
cd backend
npm test
```

See [TESTING.md](TESTING.md) for what's covered and why the suite doesn't require a live database
to run (repositories are mocked at the module boundary; the College Scorecard sync job and schema
migration were verified separately against a real disposable Postgres during development — see
that file for how to re-run that verification).

## Data ingestion

- `npm run sync:schools` — pulls US schools from the College Scorecard API and upserts them.
  Safe to re-run; it can only ever overwrite rows it created (see `schoolRepository.js` and
  `DATA_SOURCES.md`).
- `npm run seed` — loads the manually curated non-US schools, scholarships, and placeholder visa
  checklists. These are **not** launch-ready — see the "reviewed_by" / "verified_by" fields, which
  are null until someone actually checks them (see RISK_NOTES.md and DATA_SOURCES.md).

## AI provider

`AI_PROVIDER=mock` (the default) uses `MockProvider` — no network calls, no AWS credentials
needed. For school-ranking it's a simple fixture, but for essay/SOP feedback it isn't: it runs a
real, deterministic rubric-based heuristic engine
(`backend/src/ai-engine/heuristics/analyzeSopText.js`) against whatever text was actually
submitted, so scores and comments genuinely vary per essay in local dev. That rubric — grounded in
published admissions-office/writing-center guidance, sources cited in
`backend/src/ai-engine/sopRubric.js` — is also embedded directly in the prompts sent to a real
provider (`analyzeStructural.js`/`analyzePersonalized.js`), so switching to a real model changes
depth and nuance, not which criteria are graded. Set `AI_PROVIDER=bedrock` to use real Bedrock/
Claude calls once `backend/src/ai-engine/BedrockProvider.js`'s TODO is implemented and AWS
credentials/model access are provisioned.

### Essay/SOP upload

`POST /api/documents` accepts either pasted text (`{ rawText, essayType? }` as JSON) or a file
upload (`multipart/form-data` with a `file` field, plus optional `essayType`) — `.txt`, `.md`,
`.pdf`, and `.docx` are supported, extracted server-side in `backend/src/services/
fileExtraction.js`, capped at 5MB. Structural feedback now includes a rubric-weighted
`overall_score` (0-100) and `score_label` band alongside the per-dimension scores.

### Application-type rubrics

`essayType` (default `general`) picks which rubric a document is graded against —
`undergraduate`, `graduate`, `phd`, `uk_undergraduate`, `scholarship`, or `fellowship`, each
sourced from a specific rubric published at [gradpilot.com/rubrics](https://gradpilot.com/rubrics)
(see the citations and source URLs in `backend/src/ai-engine/sopRubric.js` ESSAY_RUBRICS).
Every type has its own named dimensions (e.g. PhD's "Faculty Alignment and Program Ecosystem"
vs. Common App's "One Main Moment"), its own word-count expectations, and even disagrees on
whether a forward-looking closing paragraph is a strength (graduate/PhD/scholarship/fellowship)
or a mistake (undergraduate narrative essays, UCAS). The dev/mock heuristic engine
(`heuristics/analyzeSopText.js`) approximates each named dimension from one of five
content-derived signals it can actually compute (specificity, structure, originality, goal
clarity, mechanics) — a real LLM provider gets the full rubric text via `analyzeStructural.js`
and scores every dimension independently. `essay_type` is persisted per document (see migration
`1700000005000_documents-essay-type.js`).

### Stage 2 retrieval (RAG)

Premium's personalized feedback (`analyzePersonalized.js`) is grounded in real accepted/rejected
essays for the student's `intended_major`, not just the model's unaided judgment. The essay is
embedded (`backend/src/ai-engine/embeddingProvider.js`), the closest examples are retrieved by
pgvector cosine distance (`backend/src/repositories/essayExampleRepository.js`, HNSW-indexed), and
rendered into the prompt as a `<BaselineExamples>` block the model is instructed to compare the
student's essay against.

- `npm run seed` now also loads three dev fixture rows into `essay_examples`
  (`backend/src/data-ingestion/seed/seed-essays.js`) — their embeddings are `Math.random()`
  placeholders, fine for exercising the retrieval query end-to-end under `AI_PROVIDER=mock`, but
  meaningless as similarity rankings.
- `npm run ingest:essays -- path/to/real_sops.csv` (`backend/src/data-ingestion/jobs/
  ingest-real-essays.js`) is the real pipeline: reads a CSV (`major,outcome,text` columns), asks
  Bedrock to write the admissions-officer rationale for each row, generates a real embedding, and
  upserts into `essay_examples`. Requires `AI_PROVIDER=bedrock` — it refuses to run under
  `mock` rather than writing fake vectors into a table meant for real retrieval.
