# Testing

## Automated suite (`cd backend && npm test`)

23 tests across 8 files, run with Vitest. None require a live database or network — repositories
are mocked at the module boundary (`vi.mock('.../repositories/...')`), and the AI engine defaults
to `AI_PROVIDER=mock`, a deterministic in-process fixture provider.

**Unit** (`tests/unit/`)
- `checkTier.test.js` — tier-gating middleware: allows matching/higher tiers, blocks lower tiers
  with the structured `TIER_UPGRADE_REQUIRED` envelope (never a bare 403), handles a missing
  `req.user.tier` without throwing.
- `validate.test.js` — zod-schema middleware: passes through valid input (stripped to schema
  shape), rejects invalid input with `400 VALIDATION_ERROR` and field-level detail.
- `matchingService.test.js` — proves `rankCandidates()` is only ever given the exact candidate
  array returned by the (mocked) DB query, never a larger/unfiltered pool. This is the test
  required by the Phase 4 spec for the "AI never sees unfiltered data" architectural rule.
- `collegeScorecardMapping.test.js` — the pure `mapRecordToSchool()` field-mapping function
  against a saved fixture (`tests/fixtures/college-scorecard-sample.json`), including a
  null-field case (missing admission rate).
- `requestLogging.test.js` — regression test for a real bug found during manual verification
  (see below): a route handler that responds without calling `next()` inside a mounted
  sub-router used to log the router-relative path instead of the full mounted path.

**Integration** (`tests/integration/`, via `supertest` against the real Express app)
- `tierGating.test.js` — a basic-tier JWT hitting `/api/matches` or `/api/cost-of-living`
  directly gets `403 TIER_UPGRADE_REQUIRED`; an unauthenticated request gets `401` before the
  tier check even runs.
- `documentUpload.test.js` — basic tier gets structural-only feedback; premium gets structural +
  personalized; a basic user's second essay upload is rejected with `409 DOCUMENT_LIMIT_REACHED`
  even though that route carries no tier middleware (the limit is enforced in the service layer);
  malformed input is rejected with `400` before the repository is touched.
- `profile.test.js` — create/update, `404 PROFILE_NOT_FOUND` when none exists, `401` when
  unauthenticated, `400` on an invalid `budgetRange` enum value.

Run: `cd backend && npm test` (or `npm run test:watch`).

## Manual verification against real infrastructure

The automated suite intentionally mocks the database so it can run without infrastructure. During
development, the following was verified against a **real, disposable Postgres** (via
`backend/docker-compose.yml`) and the **real College Scorecard API** (DEMO_KEY), then torn down:

- `npm run migrate:up` applies `1700000000000_init-schema.js` cleanly against Postgres 16.
- `npm run seed` loads 12 manually curated schools, 10 scholarships, and 3 visa placeholders.
- `npm run sync:schools` pulled 100 real US schools from the live College Scorecard API in one
  page, with real tuition/admission-rate figures landing in the `schools` table.
- **Provenance guarantee**: an MD5 fingerprint of all `manual_curated` school rows was taken
  before and after running the Scorecard sync — identical both times, confirming an automated
  sync can never touch hand-curated data (enforced by the `(source, external_id)` unique
  constraint — see `schoolRepository.js`).
- Full HTTP flow via `curl` against the running server: register → duplicate-register rejected →
  profile create/read → basic-tier essay upload (structural feedback only) → second upload
  rejected (`DOCUMENT_LIMIT_REACHED`) → `/api/matches` rejected for basic tier → static visa
  checklist. Then, after manually upgrading the test user to premium: essay upload returns both
  feedback stages, `/api/matches` returns real DB-filtered, AI-ranked school matches and
  scholarship candidates, personalized visa checklist for a curated country pair, and `404
  VISA_DATA_UNAVAILABLE` for an uncurated pair.

This manual pass surfaced and fixed three real bugs before they shipped:
1. `visaRepository.insertVisaRequirement` passed a JS array directly as a JSONB query parameter —
   `node-postgres` serializes bare arrays as Postgres array literals, not JSON, so it needs
   `JSON.stringify()` first. Fixed; only affected `checklist_json` (the one JSONB column storing
   an array rather than an object).
2. `schoolRepository.findCandidateSchools` treated an empty `major_tags` as "matches no major,"
   which zeroed out every US school (College Scorecard's per-major data isn't pulled for MVP —
   see DATA_SOURCES.md). Fixed to treat empty `major_tags` as "unclassified, don't filter," the
   same convention already used for scholarship nationality eligibility.
3. `MockProvider`'s ranking-stage fixture returned a hardcoded placeholder school id instead of
   echoing back the candidates it was actually given. `rankCandidates()` correctly filters its
   output to only known candidate ids (see matchingService.test.js), so the placeholder id was
   silently stripped — the dev/test experience always showed zero matches even when the DB query
   was correct. Fixed the mock to rank the real candidates from the prompt.

## Frontend

`cd frontend && npm run build` compiles cleanly (verified). The UI has **not** been exercised in
an actual browser in this pass — only its build output and module graph were checked. Before
relying on it, click through the golden path (register → profile → essay upload → matches →
upgrade prompt on a basic account) in a browser against the running backend.

## Not yet covered

- No test exercises the real Postgres upsert/conflict semantics automatically (the provenance
  guarantee above was checked manually, not as a repeatable CI test) — would need a Postgres
  service container in CI to automate.
- No load or concurrency testing.
- `BedrockProvider` has no test coverage since it's an intentional TODO stub.
