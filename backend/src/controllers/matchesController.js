import { computeMatches } from '../services/matchingService.js';

export async function getMatches(req, res, next) {
  try {
    const matches = await computeMatches(req.user);
    res.status(200).json(matches);
  } catch (err) {
    next(err);
  }
}
