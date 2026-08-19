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
| POST | `/api/profile` | required | any | Create/update the caller's profile. Body matches `profiles` columns minus `user_id`. |
| GET | `/api/profile` | required | any | Return the caller's profile. `404` with `PROFILE_NOT_FOUND` if none yet. |

## Documents & feedback

| Method | Path | Auth | Tier | Description |
|---|---|---|---|---|
| POST | `/api/documents` | required | any | Upload an essay/statement of purpose for review — pasted text (JSON body `{rawText, essayType?}`) or a file (`multipart/form-data`, field `file`, plus optional field `essayType`; `.txt`/`.md`/`.pdf`/`.docx`, 5MB max). `essayType` selects which rubric to grade against — one of `general` (default), `undergraduate`, `graduate`, `phd`, `uk_undergraduate`, `scholarship`, `fellowship` (see `backend/src/constants/essayTypes.js`); an unrecognized value returns `400` `VALIDATION_ERROR`. Triggers Stage 1 analysis always; Stage 2 only if caller is premium. Basic callers are limited to 1 document total — additional uploads return `409` `DOCUMENT_LIMIT_REACHED` with an upgrade hint. |
| GET | `/api/documents` | required | any | List caller's documents (premium: full version history; basic: the single allowed document). |
| GET | `/api/feedback/:documentId` | required | any | Returns feedback rows for the document. Basic tier only ever has a `stage='structural'` row; premium may have both. `403` `NOT_YOUR_DOCUMENT` if `documentId` doesn't belong to caller. |

## Matching

| Method | Path | Auth | Tier | Description |
|---|---|---|---|---|
| GET | `/api/matches` | required | **premium** | School + scholarship matches for caller's profile. `checkTier('premium')` returns the `TIER_UPGRADE_REQUIRED` envelope above (403) for basic callers — never a bare 403, never a silently empty list. |

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
