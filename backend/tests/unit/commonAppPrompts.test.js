import { describe, it, expect } from 'vitest';
import {
  COMMON_APP_PROMPTS,
  COMMON_APP_PROMPT_IDS,
  COMMON_APP_WORD_LIMIT,
  commonAppPromptById,
  COMMON_APP_PROMPT_KEYWORDS,
} from '../../src/constants/commonAppPrompts.js';

describe('COMMON_APP_PROMPTS', () => {
  it('has exactly the 7 official 2025-2026 prompts, numbered 1-7', () => {
    expect(COMMON_APP_PROMPTS).toHaveLength(7);
    expect(COMMON_APP_PROMPT_IDS).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('every prompt has non-empty text', () => {
    for (const prompt of COMMON_APP_PROMPTS) {
      expect(typeof prompt.text).toBe('string');
      expect(prompt.text.length).toBeGreaterThan(20);
    }
  });

  it('the official word limit is 650', () => {
    expect(COMMON_APP_WORD_LIMIT).toBe(650);
  });

  it('commonAppPromptById returns the matching prompt, or null for an unknown id', () => {
    expect(commonAppPromptById(2)?.text).toMatch(/challenge/i);
    expect(commonAppPromptById(99)).toBeNull();
  });

  it('has keyword sets for prompts 1-6 but not prompt 7 (any topic has no fixed theme)', () => {
    for (const id of [1, 2, 3, 4, 5, 6]) {
      expect(COMMON_APP_PROMPT_KEYWORDS[id]?.length).toBeGreaterThan(0);
    }
    expect(COMMON_APP_PROMPT_KEYWORDS[7]).toBeUndefined();
  });
});
