import { Router } from 'express';
import * as profileController from '../controllers/profileController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profileSchema } from './schemas.js';

export const profileRoutes = Router();

profileRoutes.post('/', requireAuth, validate(profileSchema), profileController.saveProfile);
profileRoutes.get('/', requireAuth, profileController.getProfile);
