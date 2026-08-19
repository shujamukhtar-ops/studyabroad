import { describe, it, expect } from 'vitest';
import { analyzePersonalized } from '../../src/ai-engine/analyzePersonalized.js';

function spyProvider(response) {
  let capturedPrompt = null;
  const provider = {
    invoke: async (prompt) => {
      capturedPrompt = prompt;
      return JSON.stringify(response);
    },
  };
  return { provider, getPrompt: () => capturedPrompt };
}

describe('analyzePersonalized RAG prompt injection', () => {
  it('omits the BaselineExamples block entirely when no examples were retrieved', async () => {
    const { provider, getPrompt } = spyProvider({ fit_score: 5, rewrite_suggestions: [], target_school_alignment_notes: 'x' });

    await analyzePersonalized('Some essay.', { intended_major: 'computer_science' }, {}, [], provider);

    expect(getPrompt()).not.toContain('<BaselineExamples>');
  });

  it('renders retrieved examples as <Example outcome="..."> XML and instructs the model to compare against them', async () => {
    const { provider, getPrompt } = spyProvider({ fit_score: 5, rewrite_suggestions: [], target_school_alignment_notes: 'x' });
    const retrievedExamples = [
      { outcome: 'accepted', text: 'A specific, concrete essay.', notes: 'Accepted: specific and concrete.' },
      { outcome: 'rejected', text: 'Ever since I was a child...', notes: 'Rejected: cliché opener.' },
    ];

    await analyzePersonalized('Some essay.', { intended_major: 'computer_science' }, {}, retrievedExamples, provider);
    const prompt = getPrompt();

    expect(prompt).toContain(
      '<Example outcome="accepted"><EssayText>A specific, concrete essay.</EssayText><AdmissionsCommitteeNotes>Accepted: specific and concrete.</AdmissionsCommitteeNotes></Example>'
    );
    expect(prompt).toContain(
      '<Example outcome="rejected"><EssayText>Ever since I was a child...</EssayText><AdmissionsCommitteeNotes>Rejected: cliché opener.</AdmissionsCommitteeNotes></Example>'
    );
    expect(prompt).toContain('<BaselineExamples>');
    expect(prompt).toContain('</BaselineExamples>');
    expect(prompt).toContain('Calculate fit_score and write rewrite_suggestions by comparing');
    expect(prompt).toContain('"accepted" examples or fall into the traps of the');
    expect(prompt).toContain('"rejected" ones.');
  });
});
