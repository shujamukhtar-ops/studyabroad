/**
 * @typedef {Object} AIProvider
 * @property {(prompt: string, options?: { system?: string, maxTokens?: number }) => Promise<string>} invoke
 *   Returns the raw text completion. Callers are responsible for parsing/validating JSON out of it.
 */

// No concrete class here on purpose — MockProvider and BedrockProvider both just need to
// satisfy this shape. Keeping it a JSDoc contract (not a base class) avoids an inheritance
// hierarchy nothing else needs.
export {};
