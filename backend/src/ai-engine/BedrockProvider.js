import { env } from '../config/env.js';

// TODO(real integration): wire this up to AWS Bedrock's Converse API once credentials
// and model access are provisioned. Left unimplemented deliberately — do not stub in a
// fake network call, since that would silently pass in an environment with no real AWS access.
//
// Expected request shape (Bedrock Converse API, Claude on Bedrock):
//   import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
//   const client = new BedrockRuntimeClient({ region: env.awsRegion });
//   const command = new ConverseCommand({
//     modelId: env.bedrockModelId,               // e.g. 'anthropic.claude-sonnet-5'
//     system: options.system ? [{ text: options.system }] : undefined,
//     messages: [{ role: 'user', content: [{ text: prompt }] }],
//     inferenceConfig: { maxTokens: options.maxTokens ?? 1024, temperature: 0.3 },
//   });
//
// Expected response shape:
//   const response = await client.send(command);
//   // response.output.message.content: [{ text: string }]
//   const text = response.output.message.content[0].text;
//   return text;
//
// Error handling to add when implemented: throttling/backoff (Bedrock returns
// ThrottlingException under load) and a timeout, since this sits behind user-facing requests.
export const BedrockProvider = {
  async invoke(_prompt, _options = {}) {
    throw new Error(
      `BedrockProvider.invoke() is not yet implemented (model=${env.bedrockModelId}, region=${env.awsRegion}). ` +
        `Set AI_PROVIDER=mock for local development, or implement the TODO in this file to enable real Bedrock calls.`
    );
  },
};
