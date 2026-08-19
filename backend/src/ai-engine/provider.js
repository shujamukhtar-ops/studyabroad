import { env } from '../config/env.js';
import { MockProvider } from './MockProvider.js';
import { BedrockProvider } from './BedrockProvider.js';

// Single place that decides which AIProvider implementation is live. Nothing outside
// ai-engine/ should import MockProvider or BedrockProvider directly.
export function getProvider() {
  switch (env.aiProvider) {
    case 'bedrock':
      return BedrockProvider;
    case 'mock':
    default:
      return MockProvider;
  }
}
