import { Router } from 'express';
import * as costOfLivingController from '../controllers/costOfLivingController.js';
import { requireAuth } from '../middleware/auth.js';
import { checkTier } from '../middleware/checkTier.js';

export const costOfLivingRoutes = Router();

costOfLivingRoutes.get('/', requireAuth, checkTier('premium'), costOfLivingController.getCostOfLiving);
