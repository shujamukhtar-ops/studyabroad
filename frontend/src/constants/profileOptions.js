// Mirrors backend/src/constants/{countries,majors,testTypes}.js — there's no shared import
// path between frontend and backend in this project (see ProfilePage's original MAJOR_OPTIONS
// comment), so these option lists and section-scale definitions are hand-duplicated here.
// Keep them in sync: a value the backend doesn't recognize gets rejected by profileSchema
// (backend/src/routes/schemas.js) with a 400, and a section min/max mismatch here would just
// mean the browser lets the student type a score the server then bounces.

export const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Netherlands', label: 'Netherlands' },
  { value: 'Switzerland', label: 'Switzerland' },
  { value: 'Germany', label: 'Germany' },
];

export const DEGREE_LEVELS = [
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: "Graduate / Master's" },
  { value: 'phd', label: 'PhD' },
];

export const MAJOR_TAGS = [
  { value: 'computer_science', label: 'Computer Science', category: 'Computing & Technology' },
  { value: 'software_engineering', label: 'Software Engineering', category: 'Computing & Technology' },
  { value: 'data_science', label: 'Data Science', category: 'Computing & Technology' },
  { value: 'artificial_intelligence', label: 'Artificial Intelligence / Machine Learning', category: 'Computing & Technology' },
  { value: 'information_technology', label: 'Information Technology', category: 'Computing & Technology' },
  { value: 'cybersecurity', label: 'Cybersecurity', category: 'Computing & Technology' },

  { value: 'engineering', label: 'Engineering (General)', category: 'Engineering' },
  { value: 'mechanical_engineering', label: 'Mechanical Engineering', category: 'Engineering' },
  { value: 'electrical_engineering', label: 'Electrical Engineering', category: 'Engineering' },
  { value: 'civil_engineering', label: 'Civil Engineering', category: 'Engineering' },
  { value: 'chemical_engineering', label: 'Chemical Engineering', category: 'Engineering' },
  { value: 'aerospace_engineering', label: 'Aerospace Engineering', category: 'Engineering' },
  { value: 'biomedical_engineering', label: 'Biomedical Engineering', category: 'Engineering' },
  { value: 'industrial_engineering', label: 'Industrial Engineering', category: 'Engineering' },
  { value: 'environmental_engineering', label: 'Environmental Engineering', category: 'Engineering' },
  { value: 'materials_science', label: 'Materials Science & Engineering', category: 'Engineering' },

  { value: 'business', label: 'Business (General)', category: 'Business & Management' },
  { value: 'finance', label: 'Finance', category: 'Business & Management' },
  { value: 'accounting', label: 'Accounting', category: 'Business & Management' },
  { value: 'marketing', label: 'Marketing', category: 'Business & Management' },
  { value: 'management', label: 'Management', category: 'Business & Management' },
  { value: 'entrepreneurship', label: 'Entrepreneurship', category: 'Business & Management' },
  { value: 'human_resources', label: 'Human Resources', category: 'Business & Management' },
  { value: 'supply_chain_management', label: 'Supply Chain Management', category: 'Business & Management' },
  { value: 'international_business', label: 'International Business', category: 'Business & Management' },

  { value: 'economics', label: 'Economics', category: 'Economics & Social Sciences' },
  { value: 'political_science', label: 'Political Science', category: 'Economics & Social Sciences' },
  { value: 'international_relations', label: 'International Relations', category: 'Economics & Social Sciences' },
  { value: 'public_policy', label: 'Public Policy', category: 'Economics & Social Sciences' },
  { value: 'sociology', label: 'Sociology', category: 'Economics & Social Sciences' },
  { value: 'anthropology', label: 'Anthropology', category: 'Economics & Social Sciences' },
  { value: 'psychology', label: 'Psychology', category: 'Economics & Social Sciences' },
  { value: 'criminology', label: 'Criminology', category: 'Economics & Social Sciences' },
  { value: 'geography', label: 'Geography', category: 'Economics & Social Sciences' },

  { value: 'law', label: 'Law', category: 'Law' },

  { value: 'biology', label: 'Biology', category: 'Natural Sciences' },
  { value: 'chemistry', label: 'Chemistry', category: 'Natural Sciences' },
  { value: 'physics', label: 'Physics', category: 'Natural Sciences' },
  { value: 'environmental_science', label: 'Environmental Science', category: 'Natural Sciences' },
  { value: 'earth_science', label: 'Earth & Geological Sciences', category: 'Natural Sciences' },
  { value: 'astronomy', label: 'Astronomy / Astrophysics', category: 'Natural Sciences' },
  { value: 'marine_science', label: 'Marine Science', category: 'Natural Sciences' },

  { value: 'mathematics', label: 'Mathematics', category: 'Mathematics & Statistics' },
  { value: 'statistics', label: 'Statistics', category: 'Mathematics & Statistics' },
  { value: 'actuarial_science', label: 'Actuarial Science', category: 'Mathematics & Statistics' },

  { value: 'medicine', label: 'Medicine', category: 'Health & Medicine' },
  { value: 'nursing', label: 'Nursing', category: 'Health & Medicine' },
  { value: 'public_health', label: 'Public Health', category: 'Health & Medicine' },
  { value: 'pharmacy', label: 'Pharmacy', category: 'Health & Medicine' },
  { value: 'dentistry', label: 'Dentistry', category: 'Health & Medicine' },
  { value: 'veterinary_medicine', label: 'Veterinary Medicine', category: 'Health & Medicine' },
  { value: 'physical_therapy', label: 'Physical Therapy', category: 'Health & Medicine' },
  { value: 'nutrition', label: 'Nutrition & Dietetics', category: 'Health & Medicine' },
  { value: 'health_administration', label: 'Health Administration', category: 'Health & Medicine' },

  { value: 'english_literature', label: 'English / Literature', category: 'Humanities' },
  { value: 'history', label: 'History', category: 'Humanities' },
  { value: 'philosophy', label: 'Philosophy', category: 'Humanities' },
  { value: 'linguistics', label: 'Linguistics', category: 'Humanities' },
  { value: 'religious_studies', label: 'Religious Studies', category: 'Humanities' },
  { value: 'classics', label: 'Classics', category: 'Humanities' },

  { value: 'modern_languages', label: 'Modern Languages', category: 'Languages & Area Studies' },
  { value: 'asian_studies', label: 'Asian Studies', category: 'Languages & Area Studies' },
  { value: 'european_studies', label: 'European Studies', category: 'Languages & Area Studies' },

  { value: 'fine_arts', label: 'Fine Arts', category: 'Arts & Design' },
  { value: 'graphic_design', label: 'Graphic Design', category: 'Arts & Design' },
  { value: 'architecture', label: 'Architecture', category: 'Arts & Design' },
  { value: 'interior_design', label: 'Interior Design', category: 'Arts & Design' },
  { value: 'fashion_design', label: 'Fashion Design', category: 'Arts & Design' },
  { value: 'film_studies', label: 'Film Studies / Production', category: 'Arts & Design' },
  { value: 'music', label: 'Music', category: 'Arts & Design' },
  { value: 'theatre_performing_arts', label: 'Theatre & Performing Arts', category: 'Arts & Design' },
  { value: 'photography', label: 'Photography', category: 'Arts & Design' },

  { value: 'communications', label: 'Communications', category: 'Communications & Media' },
  { value: 'journalism', label: 'Journalism', category: 'Communications & Media' },
  { value: 'media_studies', label: 'Media Studies', category: 'Communications & Media' },
  { value: 'public_relations', label: 'Public Relations', category: 'Communications & Media' },
  { value: 'advertising', label: 'Advertising', category: 'Communications & Media' },

  { value: 'education', label: 'Education (General)', category: 'Education' },
  { value: 'early_childhood_education', label: 'Early Childhood Education', category: 'Education' },
  { value: 'special_education', label: 'Special Education', category: 'Education' },

  { value: 'agriculture', label: 'Agriculture', category: 'Agriculture & Environment' },
  { value: 'environmental_studies', label: 'Environmental Studies', category: 'Agriculture & Environment' },
  { value: 'forestry', label: 'Forestry', category: 'Agriculture & Environment' },
  { value: 'sustainability', label: 'Sustainability Studies', category: 'Agriculture & Environment' },

  { value: 'social_work', label: 'Social Work', category: 'Other' },
  { value: 'undecided', label: 'Undecided', category: 'Other' },
];

export const MAJOR_CATEGORIES = [...new Set(MAJOR_TAGS.map((m) => m.category))];

export const TEST_TYPES = [
  {
    key: 'sat',
    label: 'SAT',
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
    sections: [
      { key: 'verbal', label: 'Verbal Reasoning', min: 130, max: 170, step: 1 },
      { key: 'quant', label: 'Quantitative Reasoning', min: 130, max: 170, step: 1 },
      { key: 'writing', label: 'Analytical Writing', min: 0, max: 6, step: 0.5 },
    ],
    totalMode: 'sum',
    totalFrom: ['verbal', 'quant'],
    totalLabel: 'Verbal + Quant',
  },
  {
    key: 'gmat',
    label: 'GMAT Focus Edition',
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
    sections: [],
    totalMode: 'single',
    totalLabel: 'Overall Score',
    totalMin: 10,
    totalMax: 160,
    totalStep: 5,
  },
];

export const TEST_TYPES_BY_KEY = Object.fromEntries(TEST_TYPES.map((t) => [t.key, t]));
