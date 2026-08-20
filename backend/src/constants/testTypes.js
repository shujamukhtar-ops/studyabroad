// Standardized-test catalog for the profile's testScores field. Each test defines its own
// sections (name, scale) and how its headline "total" is derived, because that varies by
// test and can't be generalized:
//  - 'sum': total is the arithmetic sum of specific sections (e.g. SAT = Math + Reading&Writing).
//  - 'manual': the official total isn't a simple sum of the section scores shown (ACT
//    composite, GMAT Focus Edition's proprietary scaling, IELTS/PTE overall rounding), so the
//    student reports it directly.
//  - 'single': the test has no sub-sections at all (Duolingo English Test).
// This drives both the dynamic score-entry form on the profile page (frontend/src/constants/
// profileOptions.js mirrors this file) and backend validation (routes/schemas.js), so a
// section score can never be saved outside the range the real test actually uses.
export const TEST_TYPES = [
  {
    key: 'sat',
    label: 'SAT',
    category: 'academic',
    appliesTo: ['undergraduate'],
    sections: [
      { key: 'math', label: 'Math', min: 200, max: 800, step: 10 },
      { key: 'reading_writing', label: 'Evidence-Based Reading & Writing', min: 200, max: 800, step: 10 },
    ],
    totalMode: 'sum',
    totalFrom: ['math', 'reading_writing'],
    totalLabel: 'Total',
  },
  {
    key: 'act',
    label: 'ACT',
    category: 'academic',
    appliesTo: ['undergraduate'],
    sections: [
      { key: 'english', label: 'English', min: 1, max: 36, step: 1 },
      { key: 'math', label: 'Math', min: 1, max: 36, step: 1 },
      { key: 'reading', label: 'Reading', min: 1, max: 36, step: 1 },
      { key: 'science', label: 'Science', min: 1, max: 36, step: 1 },
    ],
    totalMode: 'manual',
    totalLabel: 'Composite',
    totalMin: 1,
    totalMax: 36,
    totalStep: 1,
  },
  {
    key: 'gre',
    label: 'GRE (General Test)',
    category: 'academic',
    appliesTo: ['graduate', 'phd'],
    sections: [
      { key: 'verbal', label: 'Verbal Reasoning', min: 130, max: 170, step: 1 },
      { key: 'quant', label: 'Quantitative Reasoning', min: 130, max: 170, step: 1 },
      { key: 'writing', label: 'Analytical Writing', min: 0, max: 6, step: 0.5 },
    ],
    // Verbal + Quant only — Analytical Writing is reported separately and isn't part of the
    // 260-340 headline score.
    totalMode: 'sum',
    totalFrom: ['verbal', 'quant'],
    totalLabel: 'Verbal + Quant',
  },
  {
    key: 'gmat',
    label: 'GMAT Focus Edition',
    category: 'academic',
    appliesTo: ['graduate'],
    sections: [
      { key: 'quant', label: 'Quantitative Reasoning', min: 60, max: 90, step: 1 },
      { key: 'verbal', label: 'Verbal Reasoning', min: 60, max: 90, step: 1 },
      { key: 'data_insights', label: 'Data Insights', min: 60, max: 90, step: 1 },
    ],
    totalMode: 'manual',
    totalLabel: 'Total Score',
    totalMin: 205,
    totalMax: 805,
    totalStep: 10,
  },
  {
    key: 'toefl',
    label: 'TOEFL iBT',
    category: 'english_proficiency',
    appliesTo: ['undergraduate', 'graduate', 'phd'],
    sections: [
      { key: 'reading', label: 'Reading', min: 0, max: 30, step: 1 },
      { key: 'listening', label: 'Listening', min: 0, max: 30, step: 1 },
      { key: 'speaking', label: 'Speaking', min: 0, max: 30, step: 1 },
      { key: 'writing', label: 'Writing', min: 0, max: 30, step: 1 },
    ],
    totalMode: 'sum',
    totalFrom: ['reading', 'listening', 'speaking', 'writing'],
    totalLabel: 'Total',
  },
  {
    key: 'ielts',
    label: 'IELTS Academic',
    category: 'english_proficiency',
    appliesTo: ['undergraduate', 'graduate', 'phd'],
    sections: [
      { key: 'listening', label: 'Listening', min: 0, max: 9, step: 0.5 },
      { key: 'reading', label: 'Reading', min: 0, max: 9, step: 0.5 },
      { key: 'writing', label: 'Writing', min: 0, max: 9, step: 0.5 },
      { key: 'speaking', label: 'Speaking', min: 0, max: 9, step: 0.5 },
    ],
    totalMode: 'manual',
    totalLabel: 'Overall Band',
    totalMin: 0,
    totalMax: 9,
    totalStep: 0.5,
  },
  {
    key: 'pte',
    label: 'PTE Academic',
    category: 'english_proficiency',
    appliesTo: ['undergraduate', 'graduate', 'phd'],
    sections: [
      { key: 'listening', label: 'Listening', min: 10, max: 90, step: 1 },
      { key: 'reading', label: 'Reading', min: 10, max: 90, step: 1 },
      { key: 'speaking', label: 'Speaking', min: 10, max: 90, step: 1 },
      { key: 'writing', label: 'Writing', min: 10, max: 90, step: 1 },
    ],
    totalMode: 'manual',
    totalLabel: 'Overall Score',
    totalMin: 10,
    totalMax: 90,
    totalStep: 1,
  },
  {
    key: 'duolingo',
    label: 'Duolingo English Test',
    category: 'english_proficiency',
    appliesTo: ['undergraduate', 'graduate', 'phd'],
    sections: [],
    totalMode: 'single',
    totalLabel: 'Overall Score',
    totalMin: 10,
    totalMax: 160,
    totalStep: 5,
  },
];

export const TEST_TYPE_VALUES = TEST_TYPES.map((t) => t.key);
export const TEST_TYPES_BY_KEY = Object.fromEntries(TEST_TYPES.map((t) => [t.key, t]));
