import { Router } from 'express';
import * as matchesController from '../controllers/matchesController.js';
import { requireAuth } from '../middleware/auth.js';

export const matchesRoutes = Router();

// No checkTier('premium') gate here anymore — matchingService.computeMatches() itself branches
// on user.tier to decide how intelligent the matching gets (holistic scoring, AI-personalized
// reasoning) rather than the whole endpoint being premium-only. See matchingService.js.
matchesRoutes.get('/', requireAuth, matchesController.getMatches);
