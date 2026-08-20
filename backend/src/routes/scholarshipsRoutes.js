import { Router } from 'express';
import * as scholarshipsController from '../controllers/scholarshipsController.js';
import { requireAuth } from '../middleware/auth.js';

export const scholarshipsRoutes = Router();

// Not tier-gated, unlike /api/matches's premium-only extras — scholarship matching is
// filtered candidate data (destination country / nationality / major), not AI-personalized
// ranking, so there's no "less intelligent" free-tier version to build here.
scholarshipsRoutes.get('/', requireAuth, scholarshipsController.getScholarships);
