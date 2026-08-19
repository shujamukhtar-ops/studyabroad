import 'dotenv/config';

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value === 'changeme') {
    throw new Error(
      `Missing or placeholder value for required environment variable: ${name}. ` +
        `Copy .env.example to .env and set a real value before starting the server.`
    );
  }
  return value;
}

// Fail fast on boot rather than surfacing a confusing error deep in a request handler.
for (const name of REQUIRED) {
  requireEnv(name);
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  aiProvider: process.env.AI_PROVIDER ?? 'mock',
  awsRegion: process.env.AWS_REGION ?? 'us-east-1',
  bedrockModelId: process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-sonnet-5',
  collegeScorecardApiKey: process.env.COLLEGE_SCORECARD_API_KEY ?? 'DEMO_KEY',
};
