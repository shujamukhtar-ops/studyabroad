import { env } from '../config/env.js';
import { getProvider } from './provider.js';
import { MockProvider } from './MockProvider.js';

// 1024 dims matches Amazon Titan Text Embeddings V2 on Bedrock — the model this stub is
// built for once AI_PROVIDER=bedrock is real (see BedrockProvider.js for the same
// deliberately-unimplemented pattern). essay_examples.embedding and the HNSW index are
// both sized to this constant; changing it requires a migration.
const EMBEDDING_DIMENSION = 1024;

// `provider.name` matches when a future named provider identifies itself that way;
// `provider === MockProvider` covers the actual singleton this codebase passes around
// (a plain object literal, so it has no `.name`); the env check is the final fallback so
// this still does the right thing if called with no explicit provider override at all.
function isMockMode(provider) {
  return provider === MockProvider || provider?.name === 'MockProvider' || env.aiProvider === 'mock';
}

export async function generateEmbedding(text, provider = getProvider()) {
  if (isMockMode(provider)) {
    // Not deterministic — two calls for the same essay text return different vectors.
    // Fine for exercising the retrieval query shape end-to-end in dev/tests, but it means
    // mock-mode "nearest neighbor" rankings are meaningless as similarity judgments (see
    // seed-essays.js, which has the same caveat for its fixture rows' embeddings).
    return Array.from({ length: EMBEDDING_DIMENSION }, () => Math.random());
  }

  // TODO(real integration): call Bedrock's InvokeModel API with amazon.titan-embed-text-v2:0
  // once credentials and model access are provisioned, e.g.:
  //   import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
  //   const client = new BedrockRuntimeClient({ region: env.awsRegion });
  //   const command = new InvokeModelCommand({
  //     modelId: 'amazon.titan-embed-text-v2:0',
  //     contentType: 'application/json',
  //     accept: 'application/json',
  //     body: JSON.stringify({ inputText: text, dimensions: EMBEDDING_DIMENSION, normalize: true }),
  //   });
  //   const response = await client.send(command);
  //   const { embedding } = JSON.parse(new TextDecoder().decode(response.body));
  //   return embedding;
  throw new Error(
    `generateEmbedding() has no real implementation for the current AI_PROVIDER (${env.aiProvider}). ` +
      `Set AI_PROVIDER=mock for local development, or implement the TODO in this file to enable real Bedrock embeddings.`
  );
}
