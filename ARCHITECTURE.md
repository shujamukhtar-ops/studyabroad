# Architecture

## 1. System overview

```mermaid
flowchart LR
    subgraph Client
        FE[React (Vite) SPA]
    end

    subgraph Backend[Node/Express API]
        RT[routes/]
        CT[controllers/]
        SV[services/]
        RP[repositories/]
        MW[middleware\nauth + checkTier + validation + errors]
    end

    subgraph AI[ai-engine/ (isolated module)]
        AP[AIProvider interface]
        BR[Bedrock/Claude — TODO, behind interface]
        MOCK[MockAIProvider — tests/dev]
    end

    subgraph Ingestion[data-ingestion/ (offline jobs, NOT request path)]
        CS[college-scorecard.js]
        HESA[hesa-discover-uni.js]
        SEED[manual/curated seed scripts]
    end

    DB[(PostgreSQL)]

    FE -->|HTTPS/JSON| RT
    RT --> MW --> CT --> SV --> RP --> DB
    SV -->|only pre-filtered candidates| AP
    AP --> BR
    AP --> MOCK
    Ingestion -->|cron / CLI, upserts| DB
```

Key property: the AI engine never talks to Postgres directly, and the ingestion layer never talks to Express directly. Both are separate modules that the `services/` layer coordinates. This means either can be swapped, mocked, or run standalone without touching the other.

## 2. Architecture pattern: layered (routes → controllers → services → repositories)

Chosen because this app has three concerns that must never leak into each other:

- **Tier gating** (basic vs premium) — must be enforced in one place (middleware), not re-checked ad hoc in every handler.
- **AI orchestration** — expensive, external, and needs to be mockable in tests and swappable when we move from a stub to a real Bedrock call.
- **Data provenance** — school/scholarship/visa data has mixed sources (government API, manual curation) and the app must never let the AI "fill in" data that isn't in Postgres.

A layered architecture keeps each of those isolated:

- `routes/` — HTTP only: method, path, calls one controller function, returns response. No logic.
- `controllers/` — parses/shapes request → calls service(s) → shapes response. No SQL, no business rules.
- `services/` — business logic: tier rules, matching/filtering, orchestrating the AI engine. This is where `checkTier()`-gated behavior actually branches.
- `repositories/` — the only place raw SQL/query-builder calls exist. Nothing above this layer knows the schema.
- `middleware/` — cross-cutting: auth (who are you), `checkTier()` (are you allowed here), validation (is this input well-formed), centralized error handling.

## 3. Folder structure

```
StudyAbroad/
├── ARCHITECTURE.md
├── schema.sql
├── DATA_SOURCES.md
├── API_SPEC.md
├── RISK_NOTES.md
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── checkTier.js
│   │   │   ├── validate.js
│   │   │   └── errorHandler.js
│   │   ├── ai-engine/
│   │   │   ├── AIProvider.js        # interface
│   │   │   ├── BedrockProvider.js   # TODO: real implementation
│   │   │   ├── MockProvider.js      # tests/dev
│   │   │   ├── analyzeStructural.js
│   │   │   ├── analyzePersonalized.js
│   │   │   └── rankCandidates.js
│   │   ├── data-ingestion/
│   │   │   ├── sources/
│   │   │   │   ├── college-scorecard.js
│   │   │   │   └── hesa-discover-uni.js
│   │   │   └── jobs/
│   │   │       └── sync-schools.js
│   │   ├── config/
│   │   │   └── env.js               # fail-fast env loader
│   │   └── logging/
│   │       └── logger.js
│   ├── migrations/
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/              # presentational only
    │   ├── containers/ (or hooks/)  # data-fetching
    │   ├── api/
    │   │   └── client.js            # single API client module
    │   └── App.jsx
    ├── package.json
    └── .env.example
```

## 4. Tier gating

Enforced by a single middleware, `middleware/checkTier.js`, applied at the route level:

```js
router.get('/api/matches', requireAuth, checkTier('premium'), matchesController.getMatches);
```

`checkTier(requiredTier)`:
- Reads `req.user.tier` (populated by `requireAuth` from the session/JWT).
- If the user meets the requirement, calls `next()`.
- If not, responds `403` with a structured upgrade-prompt body (see API_SPEC.md error envelope), never a bare 403. No route handler or controller re-implements this check — a grep for `req.user.tier` outside `middleware/` should turn up nothing.

Any service function that behaves differently per tier (e.g. `essayService.analyze()`) takes tier as an explicit parameter rather than re-deriving it, so the branching logic stays testable in isolation from HTTP.

## 5. AI engine decoupling

`ai-engine/` exposes exactly three functions to the rest of the app:

- `analyzeStructural(text)` — both tiers.
- `analyzePersonalized(text, profile, structuralResult)` — premium only.
- `rankCandidates(candidates, profile)` — premium matching; `candidates` is a list already filtered by `services/matchingService.js` from Postgres. The AI engine has no DB access and cannot query for more candidates than it's given.

All three call an `AIProvider` interface (`invoke(prompt, options)`), not a concrete SDK. `BedrockProvider` implements it for production (Bedrock/Claude call marked TODO). `MockProvider` implements it for tests/dev, returning fixture JSON. Which provider is instantiated is decided once, in `config/`, from an env var — no route or service ever imports Bedrock's SDK directly.

## 6. Data ingestion decoupling

`data-ingestion/` is a standalone module runnable via CLI (`node src/data-ingestion/jobs/sync-schools.js`) or cron — never triggered by an incoming HTTP request. It upserts into `schools`/`scholarships` and writes a row to `data_sync_log` per run. It respects source provenance: a sync job for `source='college_scorecard'` will never overwrite a row where `source='manual_curated'`. See DATA_SOURCES.md for per-source details.

## 7. Provenance rule (binding across all phases)

The AI engine is a reasoning layer over verified data, not a source of facts. It must never be prompted to generate, recall, or "fill in" tuition figures, scholarship eligibility, deadlines, or visa requirements from its own training data. Every fact-bearing field the user sees must trace back to a Postgres row with a `source` and, where applicable, a `source_url`/`last_synced_at`. This is enforced structurally (the AI functions only receive pre-queried candidate lists) and will be covered by an explicit test in Phase 4.
