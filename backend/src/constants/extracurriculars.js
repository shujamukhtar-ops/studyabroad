// The four-tier extracurricular-strength framework used throughout competitive-admissions
// counseling (see e.g. CollegeVine's "4 Tiers of Extracurricular Activities"). This app
// doesn't invent its own scale — it borrows the one counselors and applicants already think
// in, so a student picking a tier for an activity is describing it the same way an
// admissions reader would. Tier 1 is rare and exceptional (an Olympiad medal, a published
// paper, founding something with real reach); Tier 4 is broad participation that shows
// engagement but carries little weight on its own. ai-engine/admissionFitEngine.js is the
// only place these tiers turn into a number.
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

export const EXTRACURRICULAR_TIER_VALUES = EXTRACURRICULAR_TIERS.map((t) => t.value);
export const EXTRACURRICULAR_CATEGORY_VALUES = EXTRACURRICULAR_CATEGORIES.map((c) => c.value);
