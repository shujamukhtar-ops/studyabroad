import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../src/ai-engine/MockProvider.js';
import { analyzeStructural } from '../../src/ai-engine/analyzeStructural.js';
import { analyzePersonalized } from '../../src/ai-engine/analyzePersonalized.js';

describe('MockProvider SOP analysis (dynamic, not a fixed fixture)', () => {
  it('gives different structural scores to different essays instead of a hardcoded response', async () => {
    const weak = await analyzeStructural(
      'Ever since I was a child, I have been passionate about this field.',
      undefined,
      MockProvider
    );
    const strong = await analyzeStructural(
      `During my internship at a regional hospital, I redesigned the patient intake workflow, cutting average wait time from 40 minutes to 12 across three departments.

I built on that experience in my final-year project, where I worked with Dr. Aisha Bello's lab to prototype a triage-support tool now piloted at two clinics.

After this program, I plan to lead a team building similar tools for under-resourced hospitals across the region, combining the technical training this program gives me with what I learned running the pilot.`,
      undefined,
      MockProvider
    );

    expect(weak.analysis.overall_score).toBeLessThan(strong.analysis.overall_score);
    expect(weak.analysis.overall_score).not.toBe(strong.analysis.overall_score);
  });

  it('computes a major-specific fit_score for the personalized stage using the profile', async () => {
    const csEssay = 'I built a distributed systems project using algorithms and machine learning models to optimize software performance across a data pipeline.';
    const { analysis: structural } = await analyzeStructural(csEssay, undefined, MockProvider);

    const csProfile = { target_countries: ['US'], intended_major: 'computer_science', budget_range: '15-30k' };
    const { analysis: csPersonalized } = await analyzePersonalized(csEssay, csProfile, structural, [], MockProvider);

    const lawProfile = { target_countries: ['US'], intended_major: 'law', budget_range: '15-30k' };
    const { analysis: lawPersonalized } = await analyzePersonalized(csEssay, lawProfile, structural, [], MockProvider);

    expect(csPersonalized.fit_score).toBeGreaterThan(lawPersonalized.fit_score);
  });

  it('returns null fit_score with a guiding note when no intended major is set', async () => {
    const { analysis: structural } = await analyzeStructural('Some essay text here that is reasonably long for testing purposes.', undefined, MockProvider);
    const { analysis: personalized } = await analyzePersonalized(
      'Some essay text here that is reasonably long for testing purposes.',
      { target_countries: ['US'] },
      structural,
      [],
      MockProvider
    );
    expect(personalized.fit_score).toBeNull();
    expect(personalized.target_school_alignment_notes).toMatch(/intended major/i);
  });
});
