import { Router } from 'express';
import * as documentController from '../controllers/documentController.js';
import { requireAuth } from '../middleware/auth.js';

export const feedbackRoutes = Router();

feedbackRoutes.get('/:documentId', requireAuth, documentController.getFeedback);
