import { insertVisaRequirement } from '../../repositories/visaRepository.js';
import { logger } from '../../logging/logger.js';

// Checklist wording below was cross-checked in August 2026 against each destination's own
// official immigration site (travel.state.gov, gov.uk, canada.ca, immi.homeaffairs.gov.au) —
// not recalled from general model knowledge. That is still not the same thing as sign-off
// by an immigration-law professional, so reviewed_by stays null and these rows remain
// visibly unreviewed in the data itself. Fees and processing-time numbers change often
// enough that they're deliberately left out of the checklist text; each row's sourceUrl is
// the place to check current amounts. Do not treat these rows as launch-ready without a
// real legal review. See DATA_SOURCES.md and ARCHITECTURE.md §7.
//
// One row per destination, not per (home country, destination) pair — these are each
// destination's general requirements for any international student, not nationality-
// specific rules, so there's nothing a home-country dimension would add here.
const VISA_REQUIREMENTS = [
  {
    destinationCountry: 'US',
    checklistJson: [
      'Letter of acceptance and Form I-20 from your SEVP-certified school (carries your SEVIS ID)',
      'Pay the SEVIS I-901 fee before your visa interview',
      'Complete Form DS-160 (Online Nonimmigrant Visa Application) using the SEVIS ID from your I-20',
      'Pay the visa application (MRV) fee and schedule your F-1 visa interview at a US embassy or consulate',
      'Bring your DS-160 confirmation page, passport, Form I-20, and proof of financial support to the interview',
      'Passport valid for travel to the US — generally at least 6 months beyond your intended stay unless your country has a specific exemption agreement',
    ],
    sourceUrl: 'https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html',
  },
  {
    destinationCountry: 'UK',
    checklistJson: [
      'Confirmation of Acceptance for Studies (CAS) from your licensed student sponsor',
      'Apply online for a Student visa — from outside the UK, no earlier than 6 months before your course starts; from inside the UK, no earlier than 3 months before',
      'Proof you have enough money to cover your course fees and living costs',
      'Evidence you can speak, read, write, and understand English',
      'Pay the visa application fee and the Immigration Health Surcharge',
      'Provide your identity document (passport) and biometric information',
      'Tuberculosis test results, if required for your country of residence',
    ],
    sourceUrl: 'https://www.gov.uk/student-visa',
  },
  {
    destinationCountry: 'Canada',
    checklistJson: [
      'Letter of acceptance from a Designated Learning Institution (DLI)',
      'Proof of financial support — for your first year of study, or the full duration if your program is under a year (check IRCC\'s current cost-of-living figure)',
      'Complete and submit your study permit application, in most cases online',
      'Provide biometrics (fingerprints and photo) if required',
      'Valid passport or travel document',
      'Medical exam, if required based on your country of residence and length of stay',
      'Letter of explanation describing your study plans and ties to your home country',
    ],
    sourceUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html',
  },
  {
    destinationCountry: 'Australia',
    checklistJson: [
      'Confirmation of Enrolment (CoE) for each course, from a provider registered on CRICOS',
      'Meet the Genuine Student requirement — explain your circumstances, why this course and provider, and how it benefits you',
      'Evidence of English-language proficiency (e.g. IELTS, TOEFL iBT, PTE Academic), unless exempt',
      'Overseas Student Health Cover (OSHC) for the duration of your stay (visa condition 8501)',
      'Meet health requirements, which may include a medical examination with an approved panel physician',
      'Meet character requirements, including police clearance certificates for countries you\'ve lived in for 12+ months in the last 10 years',
      'If under 18: evidence of accommodation, support, and welfare arrangements while in Australia',
    ],
    sourceUrl: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
  },
];

export async function seedVisaRequirements() {
  for (const requirement of VISA_REQUIREMENTS) {
    await insertVisaRequirement({ ...requirement, reviewedBy: null });
  }
  logger.info('Seeded visa requirement placeholders', { count: VISA_REQUIREMENTS.length });
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedVisaRequirements()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
