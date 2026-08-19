import { findVisaRequirement } from '../repositories/visaRepository.js';
import { AppError } from '../middleware/errorHandler.js';

// Generic checklist shown to basic-tier users. Deliberately non-specific — the actual
// destination requirements, sourced from that destination's own official site, only come
// from the curated visa_requirements table for premium users. See DATA_SOURCES.md.
const STATIC_CHECKLIST = [
  'Valid passport (check expiry is beyond your intended stay)',
  'Proof of admission / acceptance letter',
  'Proof of financial support',
  'Visa application form for your destination country',
  'Passport-style photographs',
  'Consult your destination country\'s official immigration site for country-specific requirements',
];

export function getStaticVisaChecklist(destination) {
  return { destination, checklist: STATIC_CHECKLIST, curated: false };
}

export async function getCuratedVisaChecklist(destination) {
  const requirement = await findVisaRequirement(destination);
  if (!requirement) {
    // Never fall back to AI-generated visa content — see ARCHITECTURE.md §7 and
    // DATA_SOURCES.md. Absence of curated data means the feature is unavailable, not
    // a prompt for the model to guess.
    throw new AppError(
      404,
      'VISA_DATA_UNAVAILABLE',
      `No reviewed visa checklist is available yet for ${destination}.`
    );
  }
  return {
    destination,
    checklist: requirement.checklist_json,
    curated: true,
    lastReviewedAt: requirement.last_reviewed_at,
    sourceUrl: requirement.source_url,
  };
}
