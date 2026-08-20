// Mirrors backend/src/constants/extracurriculars.js — see profileOptions.js for why this
// project hand-duplicates option lists between frontend and backend instead of sharing an
// import path. Keep in sync: a tier/category value the backend doesn't recognize gets
// rejected by profileSchema (backend/src/routes/schemas.js) with a 400.

export const EXTRACURRICULAR_TIERS = [
  {
    value: 'tier1',
    label: 'Tier 1 — Exceptional (national/international recognition)',
    description: 'e.g. Olympiad medal, published research, national competition winner, founded an organization with major reach',
  },
  {
    value: 'tier2',
    label: 'Tier 2 — Distinguished (state/regional recognition)',
    description: 'e.g. state-level award, regional leadership role with real impact, selective summer program',
  },
  {
    value: 'tier3',
    label: 'Tier 3 — School leadership or sustained commitment',
    description: 'e.g. club president, team captain, multi-year regular involvement',
  },
  {
    value: 'tier4',
    label: 'Tier 4 — General participation',
    description: 'e.g. club member, occasional volunteering',
  },
];

export const EXTRACURRICULAR_CATEGORIES = [
  { value: 'academic_competition', label: 'Academic competition (Olympiad, science fair, debate, hackathon)' },
  { value: 'research', label: 'Research / publication' },
  { value: 'leadership', label: 'Leadership / founded an organization' },
  { value: 'volunteering', label: 'Volunteering / community service' },
  { value: 'work_experience', label: 'Work experience / internship' },
  { value: 'arts_athletics', label: 'Arts / athletics' },
  { value: 'other', label: 'Other' },
];

export const EXTRACURRICULAR_TIERS_BY_VALUE = Object.fromEntries(EXTRACURRICULAR_TIERS.map((t) => [t.value, t]));
export const EXTRACURRICULAR_CATEGORIES_BY_VALUE = Object.fromEntries(EXTRACURRICULAR_CATEGORIES.map((c) => [c.value, c]));
