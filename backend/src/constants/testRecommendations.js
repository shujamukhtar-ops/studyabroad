import { COUNTRY_VALUES } from './countries.js';

// Which standardized tests are typically expected for a given target country + degree level.
// Sourced from each program type's general practice as of 2026 (SAT/ACT for US undergraduate;
// GRE for US/Canada graduate, increasingly optional at many individual programs but still the
// default academic test; GMAT specifically for graduate business programs; an English
// proficiency test for any non-UK/US/Canada/Australia-equivalent native-English applicant
// pool). This is intentionally a general, program-agnostic guide, not a per-university
// requirement lookup — individual schools/programs vary and should always be confirmed
// directly, which is why every entry carries a `note` making that caveat explicit to the
// student rather than presenting the recommendation as a hard requirement.
const ENGLISH_TESTS = ['toefl', 'ielts', 'pte', 'duolingo'];

const BY_COUNTRY = {
  US: {
    undergraduate: {
      academic: ['sat', 'act'],
      english: ENGLISH_TESTS,
      note: 'Most US undergraduate applicants submit an SAT or ACT score (some schools are test-optional — check each program). International applicants also submit an English proficiency score unless exempt.',
    },
    graduate: {
      academic: ['gre', 'gmat'],
      english: ENGLISH_TESTS,
      note: "Many US graduate programs have made the GRE optional — confirm per program. Business master's/MBA programs typically ask for the GMAT instead of the GRE.",
    },
    phd: {
      academic: ['gre'],
      english: ENGLISH_TESTS,
      note: 'PhD programs increasingly waive the GRE, but some still require or recommend it — check the specific department.',
    },
  },
  UK: {
    undergraduate: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'UK undergraduate admissions (UCAS) are based on school qualifications such as A-levels or the IB, not the SAT/ACT. Non-native English speakers submit an English proficiency score.',
    },
    graduate: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'The GRE/GMAT is not commonly required for UK taught master’s programs, though some competitive or business (MBA) programs request one. An English proficiency score is required for non-native speakers.',
    },
    phd: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'UK PhD admission is research-proposal and interview driven, not standardized-test driven. An English proficiency score is required for non-native speakers.',
    },
  },
  Canada: {
    undergraduate: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'Most Canadian undergraduate programs admit on school grades rather than the SAT/ACT, though a few competitive programs accept them as supporting evidence. An English proficiency score is required for non-native speakers.',
    },
    graduate: {
      academic: ['gre', 'gmat'],
      english: ENGLISH_TESTS,
      note: 'Requirements vary widely by program — some Canadian graduate programs require the GRE (or GMAT for business), others waive it entirely.',
    },
    phd: {
      academic: ['gre'],
      english: ENGLISH_TESTS,
      note: 'Check with the specific department — many Canadian PhD programs no longer require the GRE.',
    },
  },
  Australia: {
    undergraduate: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'Australian undergraduate admission is based on school-leaving qualifications, not the SAT/ACT. An English proficiency score is required for non-native speakers.',
    },
    graduate: {
      academic: ['gre'],
      english: ENGLISH_TESTS,
      note: 'The GRE is requested by some competitive Australian master’s programs (especially STEM/research-focused ones) but is not universal.',
    },
    phd: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'Australian PhD admission is primarily research-proposal driven. An English proficiency score is required for non-native speakers.',
    },
  },
  Netherlands: {
    undergraduate: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'Dutch undergraduate programs taught in English require an English proficiency score for non-native speakers; the SAT/ACT is not typically required.',
    },
    graduate: {
      academic: ['gmat'],
      english: ENGLISH_TESTS,
      note: 'The GMAT is requested by some Dutch business master’s programs; most other master’s programs don’t require a standardized academic test.',
    },
    phd: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'Dutch PhD positions are typically hired as research/employment contracts rather than admitted via standardized tests.',
    },
  },
  Switzerland: {
    undergraduate: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'Swiss undergraduate admission is based on prior qualifications (e.g. Matura or equivalent). An English proficiency score applies for English-taught programs.',
    },
    graduate: {
      academic: ['gmat'],
      english: ENGLISH_TESTS,
      note: 'The GMAT is requested by some Swiss business master’s programs (e.g. St. Gallen); most technical master’s programs (e.g. ETH Zurich) don’t require a standardized academic test.',
    },
    phd: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'Swiss PhD positions are typically hired directly by a research group rather than admitted via standardized tests.',
    },
  },
  Germany: {
    undergraduate: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'German undergraduate admission is based on prior qualifications. English-taught programs require an English proficiency score; German-taught programs require a German proficiency certificate (TestDaF/DSH) instead.',
    },
    graduate: {
      academic: ['gmat'],
      english: ENGLISH_TESTS,
      note: 'The GMAT is requested by some German business master’s programs; most other master’s programs don’t require a standardized academic test. German-taught programs require TestDaF/DSH instead of an English test.',
    },
    phd: {
      academic: [],
      english: ENGLISH_TESTS,
      note: 'German PhD positions are typically hired as research positions rather than admitted via standardized tests.',
    },
  },
};

/**
 * Returns the recommended test keys for a set of target countries and a degree level, merged
 * and de-duplicated across countries, plus the per-country advisory notes. Unknown countries
 * or a missing degree level are simply skipped rather than throwing, since this is advisory
 * UI content, not a hard validation gate.
 */
export function getRecommendedTests(targetCountries = [], degreeLevel) {
  const academic = new Set();
  const english = new Set();
  const notes = [];

  for (const country of targetCountries) {
    if (!COUNTRY_VALUES.includes(country)) continue;
    const entry = BY_COUNTRY[country]?.[degreeLevel];
    if (!entry) continue;
    entry.academic.forEach((t) => academic.add(t));
    entry.english.forEach((t) => english.add(t));
    notes.push({ country, note: entry.note });
  }

  return { academic: [...academic], english: [...english], notes };
}
