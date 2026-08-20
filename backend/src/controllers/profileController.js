import * as profileService from '../services/profileService.js';
import { getRecommendedTests } from '../constants/testRecommendations.js';

export async function saveProfile(req, res, next) {
  try {
    const profile = await profileService.saveProfile(req.user.id, req.body);
    const recommendedTests = getRecommendedTests(profile.target_countries ?? [], profile.degree_level);
    res.status(200).json({ profile, recommendedTests });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    const recommendedTests = getRecommendedTests(profile.target_countries ?? [], profile.degree_level);
    res.status(200).json({ profile, recommendedTests });
  } catch (err) {
    next(err);
  }
}
