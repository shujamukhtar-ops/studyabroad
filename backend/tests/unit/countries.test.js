import { describe, it, expect } from 'vitest';
import { normalizeCountryInput, COUNTRY_VALUES } from '../../src/constants/countries.js';

describe('normalizeCountryInput', () => {
  it('recognizes the canonical value itself, case-insensitively', () => {
    expect(normalizeCountryInput('UK')).toBe('UK');
    expect(normalizeCountryInput('uk')).toBe('UK');
  });

  it('recognizes each country\'s full label', () => {
    expect(normalizeCountryInput('United Kingdom')).toBe('UK');
    expect(normalizeCountryInput('united kingdom')).toBe('UK');
  });

  it('recognizes common abbreviations and alternate names for the US', () => {
    expect(normalizeCountryInput('US')).toBe('US');
    expect(normalizeCountryInput('USA')).toBe('US');
    expect(normalizeCountryInput('usa')).toBe('US');
    expect(normalizeCountryInput('United States')).toBe('US');
    expect(normalizeCountryInput('United States of America')).toBe('US');
    expect(normalizeCountryInput('america')).toBe('US');
  });

  it('tolerates surrounding whitespace and repeated internal spaces', () => {
    expect(normalizeCountryInput('  United Kingdom  ')).toBe('UK');
    expect(normalizeCountryInput('United   Kingdom')).toBe('UK');
  });

  it('resolves every supported country to one of the fixed COUNTRY_VALUES', () => {
    for (const value of COUNTRY_VALUES) {
      expect(normalizeCountryInput(value)).toBe(value);
    }
  });

  it('returns null for an unrecognized destination rather than guessing', () => {
    expect(normalizeCountryInput('Narnia')).toBeNull();
    expect(normalizeCountryInput('')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(normalizeCountryInput(undefined)).toBeNull();
    expect(normalizeCountryInput(null)).toBeNull();
  });
});
