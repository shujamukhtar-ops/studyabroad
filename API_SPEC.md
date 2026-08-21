# API spec

Base path: `/api`. All authenticated routes expect a valid session (see RISK_NOTES.md for auth-strategy assumption). All responses are JSON.

## Error envelope

Every error response, regardless of status code, uses:

```json
{ "error": { "code": "STRING_CODE", "message": "human readable" } }
```

Tier-gated routes that reject a basic-tier user use this shape specifically (see `checkTier` below):

```json
{
  "error": {
    "code": "TIER_UPGRADE_REQUIRED",
    "message": "This feature requires a Premium subscription.",
    "upgrade": { "requiredTier": "premium", "currentTier": "basic" }
  }
}
```

## Auth

| Method | Path | Auth | Tier | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | none | — | Create account. Body: `{email, password, home_country}`. |
| POST | `/api/auth/login` | none | — | Returns session/token. Body: `{email, password}`. |
| POST | `/api/auth/logout` | required | — | Invalidates session. |

## Profile

| Method | Path | Auth | Tier | Description |
|---|---|---|---|---|
| POST | `/api/profile` | required | any | Create/update the caller's profile. Body matches `profiles` columns minus `user_id`. `targetCountries` must be values from `backend/src/constants/countries.js` `COUNTRY_VALUES`; `intendedMajor` from `constants/majors.js` `MAJOR_TAG_VALUES`; `degreeLevel` one of `undergraduate`/`graduate`/`phd`. `testScores` is an array of `{test, sections, total, testDate?}` entries — `test` is a key from `constants/testTypes.js` `TEST_TYPE_VALUES` (`sat`, `act`, `gre`, `gmat`, `toefl`, `ielts`, `pte`, `duolingo`); `sections` values are validated against that test's own scale. `holisticProfile` (the Achievements tab) is `{extracurriculars: [{category, tier, title, description?}], researchPublications?, workExperienceYears?}` — `category`/`tier` are keys from `constants/extracurriculars.js`. Any tier may fill this in; only premium matching actually uses it (see Matching below). Response includes `recommendedTests` (see below) alongside `profile`. |
| GET | `/api/profile` | required | any | Return the caller's profile. `404` with `PROFILE_NOT_FOUND` if none yet. Response: `{profile, recommendedTests}` — `recommendedTests` (`{academic, english, notes}`) is computed from the profile's `target_countries`/`degree_level` against `constants/testRecommendations.js`, listing which standardized tests are typically expected and why, per target country. |

## Documents & feedback

| Method | Path | Auth | Tier | Description |
|---|---|---|---|---|
| POST | `/api/documents` | required | any | Upload an essay/statement of purpose for review — pasted text (JSON body `{rawText, essayType?, commonAppPromptId?}`) or a file (`multipart/form-data`, field `file`, plus optional fields `essayType`/`commonAppPromptId`; `.txt`/`.md`/`.pdf`/`.docx`, 5MB max). `essayType` selects which rubric to grade against — one of `general` (default), `undergraduate` (US Common App), `graduate`, `phd`, `uk_undergraduate` (UCAS), `motivation_letter` (Netherlands/Germany/Switzerland/EU), `scholarship`, `fellowship` (see `backend/src/constants/essayTypes.js`); each corresponds to one country's actual application system, not an interchangeable label — see `backend/src/constants/essayCountryGuidance.js`. An unrecognized value returns `400` `VALIDATION_ERROR`. `commonAppPromptId` (1-7) only applies when `essayType='undergraduate'` — which of the 7 official Common App prompts (`backend/src/constants/commonAppPrompts.js`) the student is responding to; when given, both the real LLM path and the mock/dev heuristic path check whether the essay actually engages that specific prompt, not just narrative craft in general. Triggers Stage 1 analysis always; Stage 2 only if caller is premium. Basic callers are limited to 1 document total — additional uploads return `409` `DOCUMENT_LIMIT_REACHED` with an upgrade hint. |
| GET | `/api/documents` | required | any | List caller's documents (premium: full version history; basic: the single allowed document). |
| GET | `/api/feedback/:documentId` | required | any | Returns feedback rows for the document. Basic tier only ever has a `stage='structural'` row; premium may have both. `403` `NOT_YOUR_DOCUMENT` if `documentId` doesn't belong to caller. |

## Matching

| Method | Path | Auth | Tier | Description |
|---|---|---|---|---|
| GET | `/api/matches` | required | any (both tiers get real matches) | School matches for caller's profile, each tagged with a `fit_category` (`Reach`/`Target`/`Safety`) and ordered by `rank_position` — the caller's *closest profile matches first*, computed by comparing the student's academic (+ premium: holistic) index against each school's own reported profile (US News per-school average SAT/GPA, when available — see DATA_SOURCES.md; falls back to a QS-rank/admission-rate-derived estimate for schools US News doesn't cover, i.e. every non-US school) via `ai-engine/admissionFitEngine.js`'s `computeFit`/`profileDistance`. Basic: judged on academic profile only (GPA + test scores), a 15-school shortlist balanced across Reach/Target/Safety, deterministic templated reasoning, no AI provider call. Premium: additionally blends in the Achievements-tab holistic score, a wider closest-match candidate pool, and AI-generated per-school reasoning. Response is `{schools, tier, upgradeNote?}` — `upgradeNote` is present (a short, non-blocking upsell string) only for basic-tier callers. Scholarships are a separate endpoint (below), not part of this response. |
| GET | `/api/scholarships` | required | any | Candidate scholarships for the caller's profile, filtered by `destination_countries` (which country the award funds study *in* — matched against the profile's `target_countries`), `eligible_nationalities` (which country the applicant is *from* — matched against the account's `home_country`), and major. Not tiered — this is filtered data, not AI ranking. Response: `{scholarships}`, each with `amount`/`amount_text` (best-effort number + the original readable award text), `deadline` (`'YYYY-MM-DD'` or `null` for rolling/no fixed deadline — never returns an ISO datetime), and `eligibility_note`. |

## Visa checklist

| Method | Path | Auth | Tier | Description |
|---|---|---|---|---|
| GET | `/api/visa-checklist?destination=XX` | required | any | Basic: generic static checklist, not destination-specific. Premium: checklist resolved from `visa_requirements` for `destination`, sourced from that destination's official immigration site; `404` `VISA_DATA_UNAVAILABLE` if that destination hasn't been curated yet (never falls back to AI-generated content). |

## Cost of living (premium)

| Method | Path | Auth | Tier | Description |
|---|---|---|---|---|
| GET | `/api/cost-of-living?city=XX` | required | **premium** | Estimated monthly cost breakdown for a target city. |

## Middleware contract

- `requireAuth` — populates `req.user` (`id`, `tier`) or returns `401` `UNAUTHENTICATED`.
- `checkTier(requiredTier)` — compares `req.user.tier` against `requiredTier`; on failure returns `403` with the `TIER_UPGRADE_REQUIRED` envelope. Applied at the route level, never re-implemented inside a controller.
- `validate(schema)` — zod/joi schema per route; malformed input returns `400` `VALIDATION_ERROR` with field-level detail, before the request reaches a controller.
