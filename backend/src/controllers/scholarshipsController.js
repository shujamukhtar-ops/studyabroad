import * as scholarshipService from '../services/scholarshipService.js';

export async function getScholarships(req, res, next) {
  try {
    const result = await scholarshipService.getScholarshipMatches(req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
