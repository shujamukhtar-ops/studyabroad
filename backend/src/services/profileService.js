import { upsertProfile, findProfileByUserId } from '../repositories/profileRepository.js';
import { AppError } from '../middleware/errorHandler.js';

// Returns the bare profile row, matching this function's original contract — documentService.js
// and matchingService.js both call this and read fields like profile.intended_major directly,
// so wrapping the return value here would silently break them. The profile-only-facing
// "which tests should this student take" computation lives in profileController.js instead,
// which is the one caller that actually needs it.
export async function saveProfile(userId, profileInput) {
  return upsertProfile(userId, profileInput);
}

export async function getProfile(userId) {
  const profile = await findProfileByUserId(userId);
  if (!profile) {
    throw new AppError(404, 'PROFILE_NOT_FOUND', 'No profile exists for this account yet.');
  }
  return profile;
}
