import * as profileService from '../services/profileService.js';

export async function saveProfile(req, res, next) {
  try {
    const profile = await profileService.saveProfile(req.user.id, req.body);
    res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
}
