import { describe, it, expect } from 'vitest';
import { COUNTRY_ESSAY_GUIDANCE, essayGuidanceForCountry } from '../../src/constants/essayCountryGuidance.js';
import { COUNTRY_VALUES } from '../../src/constants/countries.js';
import { ESSAY_TYPE_VALUES } from '../../src/constants/essayTypes.js';

describe('COUNTRY_ESSAY_GUIDANCE', () => {
  it('covers every supported destination country', () => {
    for (const country of COUNTRY_VALUES) {
      expect(COUNTRY_ESSAY_GUIDANCE[country]).toBeDefined();
    }
  });

  it('every entry points to a real essayType', () => {
    for (const guidance of Object.values(COUNTRY_ESSAY_GUIDANCE)) {
      expect(ESSAY_TYPE_VALUES).toContain(guidance.essayType);
    }
  });

  it('routes the US to the Common App essay and the UK to the UCAS personal statement, not each other', () => {
    expect(essayGuidanceForCountry('US').essayType).toBe('undergraduate');
    expect(essayGuidanceForCountry('UK').essayType).toBe('uk_undergraduate');
  });

  it('routes Netherlands and Germany to the motivation letter rubric, not the Common App essay', () => {
    expect(essayGuidanceForCountry('Netherlands').essayType).toBe('motivation_letter');
    expect(essayGuidanceForCountry('Germany').essayType).toBe('motivation_letter');
  });

  it("doesn't invent a country-specific rubric for Canada/Australia, which have none — falls back to general", () => {
    expect(essayGuidanceForCountry('Canada').essayType).toBe('general');
    expect(essayGuidanceForCountry('Australia').essayType).toBe('general');
  });

  it('returns null for an unrecognized country', () => {
    expect(essayGuidanceForCountry('Narnia')).toBeNull();
  });
});
