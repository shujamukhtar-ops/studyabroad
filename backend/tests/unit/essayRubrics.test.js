import { describe, it, expect } from 'vitest';
import { analyzeSopText } from '../../src/ai-engine/heuristics/analyzeSopText.js';
import { analyzeStructural } from '../../src/ai-engine/analyzeStructural.js';
import { MockProvider } from '../../src/ai-engine/MockProvider.js';
import { ESSAY_RUBRICS, ESSAY_TYPE_VALUES, DEFAULT_ESSAY_TYPE } from '../../src/ai-engine/sopRubric.js';

const SAMPLE_ESSAY = `During my sophomore year at Delhi Technical University, I spent six months building a low-cost water-quality sensor for a village clinic in rural Bihar, working with Dr. Anita Rao's environmental engineering lab and a team of four undergraduates. The sensor reduced testing turnaround from three days to under two hours, and it is now used at 12 clinics across the state.

That project reframed how I think about engineering: not as an abstract set of equations, but as a way to solve a specific problem a specific community has.

At the target program, I want to work on low-cost sensing for public health, building on the Bihar project with rigorous machine learning training I have not yet had.

After completing the program, I plan to return to India and found a company building affordable diagnostic hardware for rural clinics.`;

describe('essay-type-specific rubrics (GradPilot-sourced)', () => {
  it.each(ESSAY_TYPE_VALUES)('scores against exactly the named dimensions of the %s rubric', (essayType) => {
    const result = analyzeSopText(SAMPLE_ESSAY, essayType);
    const expectedKeys = ESSAY_RUBRICS[essayType].dimensions.map((d) => d.key).sort();
    expect(Object.keys(result.scores).sort()).toEqual(expectedKeys);
    expect(result.essay_type).toBe(essayType);
    expect(result.rubric_label).toBe(ESSAY_RUBRICS[essayType].label);
  });

  it('falls back to the general rubric for an unrecognized essayType', () => {
    const result = analyzeSopText(SAMPLE_ESSAY, 'not_a_real_type');
    expect(result.essay_type).toBe(DEFAULT_ESSAY_TYPE);
    expect(Object.keys(result.scores).sort()).toEqual(ESSAY_RUBRICS.general.dimensions.map((d) => d.key).sort());
  });

  it('preserves the original dimension keys and scores for the general (default) rubric — no behavior change for existing callers', () => {
    const result = analyzeSopText(SAMPLE_ESSAY);
    expect(Object.keys(result.scores).sort()).toEqual(['goal_clarity', 'grammar', 'originality', 'specificity', 'structure']);
  });

  it('does not penalize a missing forward-looking closing for undergraduate (Common App) essays, unlike graduate', () => {
    const noForwardLookingClose = `I walked into the lab not knowing what to expect.

Three hours later, the reaction had finally turned the pale blue I had been chasing all semester, and I understood the point of the whole procedure for the first time.

That is the moment I keep coming back to when I think about why I want to keep doing this.`;

    const undergrad = analyzeSopText(noForwardLookingClose, 'undergraduate');
    const graduate = analyzeSopText(noForwardLookingClose, 'graduate');

    expect(undergrad.comments.some((c) => /doesn't clearly state what comes next/.test(c.issue))).toBe(false);
    expect(graduate.comments.some((c) => /doesn't clearly state what comes next/.test(c.issue))).toBe(true);
  });

  it("flags GradPilot's PhD rubric dimensions by name, e.g. faculty alignment", () => {
    const result = analyzeSopText('Too short.', 'phd');
    expect(result.scores).toHaveProperty('faculty_alignment_program_ecosystem');
    expect(result.scores).toHaveProperty('research_trajectory_and_purpose');
  });
});

describe('analyzeStructural essay-type prompt (MockProvider round trip)', () => {
  it('embeds ESSAY_TYPE in the prompt and MockProvider grades against that rubric', async () => {
    const { analysis, modelVersion } = await analyzeStructural(SAMPLE_ESSAY, 'scholarship', MockProvider);

    expect(analysis.essay_type).toBe('scholarship');
    expect(analysis.rubric_label).toBe(ESSAY_RUBRICS.scholarship.label);
    expect(Object.keys(analysis.scores).sort()).toEqual(
      ESSAY_RUBRICS.scholarship.dimensions.map((d) => d.key).sort()
    );
    expect(modelVersion).toBe('structural-rubric-v3');
  });

  it('defaults to the general rubric when no essayType is passed', async () => {
    const { analysis } = await analyzeStructural(SAMPLE_ESSAY, undefined, MockProvider);
    expect(analysis.essay_type).toBe('general');
  });
});
