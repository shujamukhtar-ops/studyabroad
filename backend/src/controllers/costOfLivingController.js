// Placeholder dataset until a real cost-of-living source is selected (see RISK_NOTES.md —
// not scoped as an automated integration for MVP, same as non-US school data).
const CITY_ESTIMATES = {
  london: { currency: 'GBP', rent: 1400, food: 350, transport: 150, misc: 200 },
  toronto: { currency: 'CAD', rent: 1600, food: 400, transport: 130, misc: 200 },
  sydney: { currency: 'AUD', rent: 1800, food: 450, transport: 150, misc: 250 },
};

export async function getCostOfLiving(req, res, next) {
  try {
    const city = String(req.query.city ?? '').toLowerCase();
    const estimate = CITY_ESTIMATES[city];
    if (!estimate) {
      return res.status(404).json({
        error: { code: 'COST_OF_LIVING_DATA_UNAVAILABLE', message: `No cost-of-living estimate curated yet for "${req.query.city}".` },
      });
    }
    res.status(200).json({ city, ...estimate });
  } catch (err) {
    next(err);
  }
}
