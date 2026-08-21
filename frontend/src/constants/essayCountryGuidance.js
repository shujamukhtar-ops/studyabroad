// Mirrors backend/src/constants/essayCountryGuidance.js — see that file for sourcing. Used to
// nudge a student toward the right application-essay rubric for their profile's target
// countries, since the Common App essay is a US-specific system, not a universal default.
export const COUNTRY_ESSAY_GUIDANCE = {
  US: {
    essayType: 'undergraduate',
    note: 'US undergraduate applications go through the Common App, which asks for one narrative essay responding to one of 7 fixed prompts.',
  },
  UK: {
    essayType: 'uk_undergraduate',
    note: 'UK undergraduate applications go through UCAS, which uses a structured personal statement (not the Common App) — mostly academic, sent to every university choice at once.',
  },
  Canada: {
    essayType: 'general',
    note: "Canadian universities don't share one standardized essay format — many ask for a short supplementary statement specific to that university or program instead, so the general rubric is the closest fit until you have your specific program's prompt.",
  },
  Australia: {
    essayType: 'general',
    note: "Most Australian undergraduate admissions are grades-based with no essay at all; competitive courses (e.g. medicine) may require their own personal statement, so the general rubric is the closest fit until you have your specific program's prompt.",
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
