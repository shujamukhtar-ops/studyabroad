# Data sources

Every fact-bearing field in the product (tuition, admission stats, scholarship eligibility, visa steps) must trace back to one of the sources below. The AI engine is never a data source — see ARCHITECTURE.md §7.

## Used sources

### College Scorecard (US schools)

- **Base URL**: `https://api.data.gov/ed/collegescorecard/v1/schools`
- **Auth**: `api_key` query param. Free `DEMO_KEY` works for development; a registered key from api.data.gov is required before production traffic (demo keys are throttled more aggressively under load).
- **Rate limit**: 1,000 requests/hour/IP by default on `DEMO_KEY`; a registered key raises this.
- **Server-side filters applied to every request**: `school.degrees_awarded.predominant__range=3..4` (predominantly bachelor's- or graduate-degree-granting — excludes certificate/associate's-only trade schools) and `school.operating=1` (excludes closed institutions). Without these, the ~2,200-school pool included things like military academies and cosmetology schools ranking alongside universities in matches, which isn't a useful candidate pool for this product's audience.
- **Fields used → schema mapping**:
  | Scorecard field | Column |
  |---|---|
  | `id` | `schools.external_id` |
  | `school.name` | `schools.name` |
  | `school.state` (US only) | `schools.country` = `'US'` (state kept in `raw_source_data`) |
  | `latest.cost.tuition.out_of_state` | `schools.avg_tuition` |
  | `latest.admissions.admission_rate.overall` | `schools.admission_rate` |
  | `latest.earnings.10_yrs_after_entry.median` | `schools.median_earnings` |
  | `latest.completion.completion_rate_4yr_150nt` | `schools.completion_rate` |
  | `latest.academics.program_percentage.{computer,engineering,engineering_technology,business_marketing,legal}` | `schools.major_tags` (see below) |
  | full response object | `schools.raw_source_data` |
- **Major tagging**: Scorecard has no single "this school offers major X" field. `latest.academics.program_percentage.*` gives the share of degrees a school awards across ~35 broad CIP categories; `data-ingestion/sources/college-scorecard.js` maps a subset of those onto the same `major_tags` vocabulary the manually curated schools use (`computer_science`, `engineering`, `business`, `law`) when a school awards **at least 2%** of its degrees in that category. This is a "notable share of degrees in this area" signal, not a precise "has this department" fact — it's real sourced data, not an invented tag, but it's approximate and documented as such. There is no Scorecard CIP category corresponding to `economics` specifically (it's folded into the broader, too-coarse "social_science" group), so economics-tagged matches remain `manual_curated`-only until a better source is found.
- **Refresh cadence**: monthly, via `data-ingestion/jobs/sync-schools.js` run as a scheduled job (cron/CI, not inline with requests). Every run writes one row to `data_sync_log`.
- **Provenance rule**: rows are upserted with `source = 'college_scorecard'`. The upsert is scoped so it can never touch a row with a different `source` value, even if `external_id` collides.

### HESA Discover Uni dataset (UK schools)

- **Source**: downloadable structured dataset from HESA/Office for Students (not a live REST API).
- **Fields used**: course-level tuition, entry requirements, and outcome data, aggregated to institution level for our `schools` rows.
- **Refresh cadence**: manual download + import, planned quarterly (dataset itself doesn't update more often than that).
- **Provenance**: `source = 'hesa_discover_uni'`.

### Visa requirements (curated, per destination country)

- **Source**: each destination's own official immigration site — not a general knowledge base and not AI recall. One general checklist per destination, not split by applicant nationality, since the actual requirements at this level of detail (CoE/I-20, financial proof, biometrics, health cover, etc.) apply to any international student applying to that destination rather than varying by home country. Current seeded destinations, cross-checked in August 2026:
  | Destination | Official source |
  |---|---|
  | US | https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html |
  | UK | https://www.gov.uk/student-visa |
  | Canada | https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html |
  | Australia | https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500 |
- **What "cross-checked" means here, and what it doesn't**: checklist wording was verified against each site's own published requirements at the time above, rather than written from general model knowledge. It is *not* the same thing as review by an immigration-law professional — `reviewed_by` stays `null` on these rows precisely to keep that distinction visible in the data itself (see `visaRepository.insertVisaRequirement`, which only stamps `last_reviewed_at` when `reviewed_by` is actually set). Fee amounts and processing times change often enough that they're deliberately omitted from the checklist text; the `sourceUrl` on each row is where a user should check current figures.
- **No fallback to AI-generated content**: if a destination has no curated row, `visaService.getCuratedVisaChecklist` throws `VISA_DATA_UNAVAILABLE` rather than asking the model to guess. Basic-tier users instead get a generic, non-country-specific checklist that itself just points them to their destination's official site.
- **Coverage gap**: only 4 destinations are seeded. Any other destination — including other countries in the recognized `target_countries` list (Netherlands, Switzerland, Germany) — currently has no curated row and will surface as unavailable for premium users until it's added and verified the same way.
- A country-specific caveat that genuinely does vary by nationality (e.g. "TB test results if required for your country of residence") is still fine to keep in a destination's checklist as a conditional item — the row itself just isn't keyed by home country anymore.

### US News Best Colleges export (US schools, `source = 'usnews_rankings'`)

- **Source**: a static, user-supplied export (`data-ingestion/data/usnews-rankings-2026.csv`, 1,665 rows), one row per US institution, parsed by `data-ingestion/sources/usnews-rankings.js`.
- **Why this exists alongside College Scorecard/QS, and why it's the primary signal now**: College Scorecard and QS both give institution-level admission_rate/world_rank, which `admissionFitEngine.js` turns into a selectivity *band* (e.g. "QS top 20 → threshold 90") — a reasonable estimate, but still a band shared by every school in that tier. This export instead gives each school's own reported incoming-class average SAT (`sat_avg`) and HS GPA (`hs_gpa_avg`), so the fit engine compares a student's academic index directly against the specific school's own numbers — see `admissionFitEngine.js`'s `selectivityFromSchoolAverages`. It's also now the leading key in `schoolRepository.findCandidateSchools`'s candidate ordering (`sat_avg IS NOT NULL` before `world_rank`), and the basis for `computeFit`'s `profileDistance` — the literal "how close is this student's profile to this school's" measure `matchingService.js` sorts every candidate by before either tier's own further selection. QS's world_rank remains the fallback signal it's always been, since this export doesn't cover any school outside the US.
- **How it's merged rather than duplicated**: most of these 1,665 schools already exist in `schools` from `college_scorecard`/`manual_curated`/`qs_rankings`. Rather than insert a second competing row per school, `seed-usnews-rankings.js` first tries `schoolRepository.enrichSchoolAcademicStats()` — an UPDATE by name (ignoring a trailing parenthetical abbreviation, the one systematic naming difference observed against QS's names) that writes `sat_avg`/`hs_gpa_avg` onto every existing row for that school. Only when no existing row matches at all does it fall back to inserting a fresh `usnews_rankings` row — genuinely a new candidate, not a duplicate. Re-running the seed is idempotent either way.
- **Fields used**: `name`, `state`/`city`/`zip` (US-only, so `country` is fixed to `'US'`), `acceptance_rate` (→ `admission_rate`, divided by 100 to match College Scorecard's 0-1 scale), `tuition` (→ `avg_tuition`), `sat_avg`, `hs_gpa_avg`. `rank_numeric`/`rank_display` (US News's own national rank) is deliberately **not** written to `schools.world_rank` — that column's meaning is fixed to "QS World University Rankings position" (see migration `1700000007000_schools-qs-rankings.js`), and US News's rank is a different, US-only scale. `engineering_rep_score`/`business_rep_score` presence (regardless of the score itself) tags `major_tags` with `engineering`/`business`, the same "presence is the signal" reasoning `college-scorecard.js` uses for its program-percentage tagging.
- **Coverage**: `sat_avg` populated for 1,019/1,665 rows, `hs_gpa_avg` for 950/1,665 — schools without either simply fall back to the existing world_rank/admission_rate bands, same as before this source existed.
- **Provenance**: rows inserted by this source carry `source = 'usnews_rankings'`; enrichment writes to `sat_avg`/`hs_gpa_avg` only, on whatever row(s) already exist under their own source — it never touches those rows' `source` value or other columns.

## Scholarship archive import (`source = 'scraped_archive'`)

`data-ingestion/sources/scholarships-worldwide.js` imports a subset of a static, user-supplied
scholarship dataset (`data-ingestion/data/university-scholarships-worldwide.json`, ~880 raw
rows) rather than this app operating a live scraper against any site — that distinction is
what keeps this compatible with the "deliberately not used" note below, which is about this
app crawling third-party sites itself, not about ever using data someone else already
collected. The raw dataset's own `location` field turned out not to reliably mean
"destination country" (some entries are tagged under all 8 of the dataset's region buckets at
once, which only makes sense as an audience/nationality grouping), so the import only keeps a
country tag when:
- the title was scraped under **exactly one** location across the whole dataset (a strong
  signal it's genuinely destination-specific, spot-checked against real institution names —
  Brock University, CalArts, Strathclyde Business School, etc.), and
- the title text itself doesn't name a *different* country than the assigned one, and
- the deadline isn't already in the past (most of the raw dataset is stale 2022/2023 entries).

That leaves ~292 of ~880 raw rows, each with a verifiably correct `destination_countries`
value — the rest are dropped rather than imported with a guessed or unreliable country tag.
`major_tags` and `eligible_nationalities` are left empty for every imported row (not guessed
from freeform eligibility text) for the same provenance reason (see ARCHITECTURE.md §7); the
original eligibility text is kept as `eligibility_note` instead, for the student to read
themselves.

`degree_levels` is the one exception to that "leave it empty, don't parse freeform text"
policy: the raw dataset's `eligibility` field is a comma-separated list from a small, fixed
vocabulary (`Bachelor`, `Master`, `Phd`, `Course`, plus a handful of rows where a funding
*status* like `Not Funded` leaked into this field instead) rather than open-ended prose, so a
literal substring match is a direct read of the source data, not a guess. Only `Bachelor`/
`Master`/`Phd` map onto this app's `undergraduate`/`graduate`/`phd` vocabulary; `Course` (a
non-degree short course — not one of the three degree levels this app models) and anything
unrecognized are left unmapped, same as any scholarship with no stated degree-level
restriction (see `data-ingestion/sources/scholarships-worldwide.js`).

## Deliberately not used (MVP)

- **This app operating its own live scraper against scholarship aggregator sites**
  (Scholarships.com, IEFA, Fastweb, College Board search): most prohibit automated scraping in
  their ToS, and scraped structure breaks silently when the site changes, with no freshness/
  accuracy guarantee. Not used at any point, not just MVP — see above for how the one-time
  archive import differs from this.
- **LLM-generated visa or scholarship content**: never used as a source. `visa_requirements` rows are hand-entered and require `reviewed_by` + `last_reviewed_at`; getting this wrong has real consequences for a user's application, so it does not go through any automated pipeline.
- **"College Scorecard scraper" third-party wrappers**: unnecessary — we call the free government API directly.

## Not yet automated (manual curation for MVP)

Canada, Australia, and EU school data have no single equivalent to College Scorecard. For MVP these are hand-entered rows with `source = 'manual_curated'`, `source_url` populated per row so each can be spot-checked later. Automating these (e.g. Australia's QILT data, Canada's CBIE data) is a post-MVP candidate, tracked but not committed to in this phase — see RISK_NOTES.md.

A handful of flagship scholarships (Fulbright, Chevening, DAAD, Vanier, ...) are similarly hand-entered `manual_curated` rows; the bulk of scholarship rows are the vetted `scraped_archive` import described above, which has no `source_url` for most rows (the raw archive's `url` field was almost always `N/A`) — a real gap worth closing before treating this data as fully spot-checkable the way the manually curated rows are.
