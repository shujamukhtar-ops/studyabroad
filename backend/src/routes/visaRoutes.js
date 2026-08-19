import { Router } from 'express';
import * as visaController from '../controllers/visaController.js';
import { requireAuth } from '../middleware/auth.js';

export const visaRoutes = Router();

// Basic vs premium behavior is branched inside the controller (generic vs curated
// checklist) rather than split into two routes, per API_SPEC.md.
visaRoutes.get('/', requireAuth, visaController.getVisaChecklist);
