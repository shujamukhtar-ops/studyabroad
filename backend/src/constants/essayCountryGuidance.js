// Which undergraduate application-essay format actually applies per destination country —
// the Common App (and its 7 prompts) is a US-specific system, not a global standard. A student
// applying to the UK goes through UCAS's personal statement instead; the Netherlands and
// Germany commonly require a motivation letter for selective programs; Canada and Australia
// don't have one standardized national essay format at all. Surfaced by the frontend
// (DocumentsPage.jsx) as a hint when a student's selected essayType doesn't match their
// profile's target_countries — not enforced server-side, since a student may legitimately be
// drafting for a different country's application than their saved profile, or for a program
// this table doesn't capture. Only covers the 7 destinations constants/countries.js supports.
//
// Sources: Common App prompts confirmed via commonapp.org (see commonAppPrompts.js); UCAS
// personal statement guidance via GradPilot (sopRubric.js's uk_undergraduate rubric) and
// CollegeEssayGuy (collegeessayguy.com/blog/ucas-personal-statement-examples, fetched August
// 2026); motivation letter guidance for Netherlands/Germany via GradPilot
// (gradpilot.com/news/how-to-write-motivation-letter-dutch-universities, fetched August 2026)
// and expatrio.com/studying-in-germany.org for corroboration. Canada/Australia notes reflect
// that neither has a single national essay requirement (OUAC and most Canadian provincial
// application portals leave essays to individual universities/programs; most Australian
// undergraduate offers are grades-based with no essay, aside from competitive programs like
// medicine) — deliberately routed to the 'general' rubric rather than an invented
// country-specific one, per this app's provenance rule (ARCHITECTURE.md §7).
export const COUNTRY_ESSAY_GUIDANCE = {
  US: {
    essayType: 'undergraduate',
    note: 'US undergraduate applications go through the Common App, which asks for one narrative essay responding to one of 7 fixed prompts.',
  },
  UK: {
    essayType: 'uk_undergraduate',
    note: "UK undergraduate applications go through UCAS, which uses a structured personal statement (not the Common App) — mostly academic, sent to every university choice at once.",
  },
  Canada: {
    essayType: 'general',
    note: "Canadian universities don't share one standardized essay format — many ask for a short supplementary statement specific to that university or program instead of a single national essay, so this app's general SOP rubric is the closest fit until you have your specific program's prompt.",
  },
  Australia: {
    essayType: 'general',
    note: "Most Australian undergraduate admissions are grades-based with no essay at all; competitive courses (e.g. medicine) may require their own personal statement, so this app's general SOP rubric is the closest fit until you have your specific program's prompt.",
  },
  Netherlands: {
    essayType: 'motivation_letter',
    note: 'Dutch selective ("numerus fixus") programs typically require a motivation letter, not a Common-App-style narrative essay.',
  },
  Germany: {
    essayType: 'motivation_letter',
    note: 'German university applications (selective bachelor\'s programs, and virtually all master\'s programs) typically require a motivation letter (Motivationsschreiben).',
  },
  Switzerland: {
    essayType: 'motivation_letter',
    note: 'Swiss university applications commonly require a motivation letter rather than a Common-App-style narrative essay.',
  },
};

// Returns the recommended essayType + explanatory note for a country, or null if the country
// isn't recognized (e.g. not one of constants/countries.js's COUNTRY_VALUES).
export function essayGuidanceForCountry(country) {
  return COUNTRY_ESSAY_GUIDANCE[country] ?? null;
}
