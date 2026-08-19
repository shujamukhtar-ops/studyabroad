import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './logging/logger.js';

const app = createApp();

app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`, { nodeEnv: env.nodeEnv, aiProvider: env.aiProvider });
});
