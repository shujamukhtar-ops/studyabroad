# Risk notes & assumptions

These are decisions made to keep Phase 1 moving without a live spec review for every detail. Flag anything here you want changed before Phase 2 scaffolding starts — they're cheap to change now, expensive after code exists.

## Assumptions made

- **Backend framework**: Express, not Fastify. Reasoning: larger ecosystem, more boring/predictable middleware behavior, and the team's likely familiarity is higher. Fastify's perf edge doesn't matter at this scale.
- **Migration tool**: plain SQL migrations via `node-pg-migrate`, not an ORM (Prisma/Sequelize). Reasoning: the schema is small and stable, `raw_source_data JSONB` and array/GIN-index columns are easier to express in hand-written SQL than through most ORM schema DSLs, and the layered architecture already isolates SQL to `repositories/`, so an ORM's main benefit (abstracting SQL) is less valuable here. This is the one most worth double-checking against your own preference.
- **Auth strategy**: JWT in an httpOnly cookie, `bcrypt` for password hashing, no third-party auth provider (Auth0/Clerk) for MVP. Reasoning: keeps infra surface small; can migrate to a provider later without changing the `users` table shape much. If you want social login or want to punt on auth security entirely, a provider is worth reconsidering now, since `middleware/auth.js` is built around this choice.
- **Payment/billing**: out of scope for Phase 1–4. `users.tier` is assumed to be set manually (admin action or a stubbed webhook endpoint) until a real payment provider (Stripe is the default choice if/when needed) is wired in. Flag if you want Stripe integrated as part of this build rather than punted.
- **Hosting target**: Docker-based backend, deployable to AWS (ECS or EC2) so it sits next to Bedrock, but nothing in Phase 1–4 hardcodes AWS beyond the Bedrock AI provider itself. Frontend assumed static-hosted (S3+CloudFront or Vercel-equivalent) — not committed either way.
- **Non-US school/scholarship data for MVP**: Canada/Australia/EU schools and all scholarships are manually curated (~10-15 rows each), not pulled from an automated source, because no equivalent to College Scorecard exists for those regions. This is explicitly a manual-data-entry task, not an integration task, for MVP. Automating Australia (QILT) or Canada (CBIE) data is a reasonable v2 candidate.
- **Visa data**: `visa_requirements` starts with 2-3 seeded country pairs, clearly marked as placeholder structure requiring legal/expert review before being shown to real users. This table will have very low coverage at launch by design — better to show "not yet available" than a wrong checklist.

## Open questions (need your input before Phase 2, or I'll proceed with the assumption above)

1. Migration tool: `node-pg-migrate` vs Prisma — confirm or override.
2. Auth: build our own JWT auth, or use a provider (Clerk/Auth0)?
3. Is Stripe (or any billing) in scope for this build, or is tier switching manual/admin-only for now?
4. Hosting target beyond "AWS + Bedrock for AI" — any preference on ECS/EC2/Lambda, or should that stay undecided until later?
