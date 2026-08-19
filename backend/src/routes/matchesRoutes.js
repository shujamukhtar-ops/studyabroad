import { Router } from 'express';
import * as matchesController from '../controllers/matchesController.js';
import { requireAuth } from '../middleware/auth.js';
import { checkTier } from '../middleware/checkTier.js';

export const matchesRoutes = Router();

matchesRoutes.get('/', requireAuth, checkTier('premium'), matchesController.getMatches);
