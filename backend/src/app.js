import express from 'express';
import cors from 'cors';
import { authRoutes } from './routes/authRoutes.js';
import { profileRoutes } from './routes/profileRoutes.js';
import { documentRoutes } from './routes/documentRoutes.js';
import { feedbackRoutes } from './routes/feedbackRoutes.js';
import { matchesRoutes } from './routes/matchesRoutes.js';
import { visaRoutes } from './routes/visaRoutes.js';
import { costOfLivingRoutes } from './routes/costOfLivingRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './logging/logger.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    const start = Date.now();
    // Capture method/path now, not inside the finish handler: Express only restores
    // req.url to the full mounted path after a sub-router's stack calls next(), and a
    // terminal handler that ends the response directly (no next()) never triggers that
    // restore — req.path would read back as the router-relative path instead.
    // req.originalUrl is never mutated by routing, so it's safe to read lazily too, but
    // capturing here keeps this middleware's behavior independent of where it's mounted.
    const method = req.method;
    const path = req.originalUrl.split('?')[0];
    res.on('finish', () => {
      logger.info('request', {
        method,
        path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  });

  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/matches', matchesRoutes);
  app.use('/api/visa-checklist', visaRoutes);
  app.use('/api/cost-of-living', costOfLivingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
