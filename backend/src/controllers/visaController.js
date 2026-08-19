import * as visaService from '../services/visaService.js';

export async function getVisaChecklist(req, res, next) {
  try {
    const { destination } = req.query;

    if (req.user.tier === 'premium') {
      const result = await visaService.getCuratedVisaChecklist(destination);
      return res.status(200).json(result);
    }

    res.status(200).json(visaService.getStaticVisaChecklist(destination));
  } catch (err) {
    next(err);
  }
}
