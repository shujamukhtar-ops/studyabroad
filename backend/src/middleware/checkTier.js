import { AppError } from './errorHandler.js';

const TIER_RANK = { basic: 0, premium: 1 };

// The single place tier access is enforced. Route definitions apply this after requireAuth;
// no controller or service should re-derive access from req.user.tier on its own.
export function checkTier(requiredTier) {
  return function checkTierMiddleware(req, res, next) {
    const currentTier = req.user?.tier ?? 'basic';
    if (TIER_RANK[currentTier] >= TIER_RANK[requiredTier]) {
      return next();
    }
    next(
      new AppError(403, 'TIER_UPGRADE_REQUIRED', 'This feature requires a Premium subscription.', {
        upgrade: { requiredTier, currentTier },
      })
    );
  };
}
