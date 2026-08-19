import { upsertProfile, findProfileByUserId } from '../repositories/profileRepository.js';
import { AppError } from '../middleware/errorHandler.js';

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
