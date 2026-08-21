import { describe, it, expect } from 'vitest';
import { analyzeSopText } from '../../src/ai-engine/heuristics/analyzeSopText.js';

const CLICHE_WEAK_ESSAY = `Ever since I was a child, I have always been passionate about computer science. I am a hardworking, dedicated, and unique individual. In today's world, technology is very important. Education is the key to success.`;

const STRONG_ESSAY = `During my sophomore year at Delhi Technical University, I spent six months building a low-cost water-quality sensor for a village clinic in rural Bihar, working with Dr. Anita Rao's environmental engineering lab and a team of four undergraduates. The sensor reduced testing turnaround from three days to under two hours, and it is now used at 12 clinics across the state.

That project reframed how I think about engineering: not as an abstract set of equations, but as a way to solve a specific problem a specific community has. In my coursework at DTU, I have taken Embedded Systems, Signal Processing, and Applied Statistics, each of which gave me tools I used directly in the sensor's design.

At the target program, I want to work on low-cost sensing for public health, building on the Bihar project with rigorous machine learning training I have not yet had.

After completing the program, I plan to return to India and found a company building affordable diagnostic hardware for rural clinics, using the technical depth this program will give me. This has been my goal since the sensor project began, and I intend to spend the next decade pursuing it.`;

describe('analyzeSopText', () => {
  it('scores a cliché-laden, generic essay well below a specific, well-structured one', () => {
    const weak = analyzeSopText(CLICHE_WEAK_ESSAY);
    const strong = analyzeSopText(STRONG_ESSAY);
    expect(weak.overall_score).toBeLessThan(strong.overall_score);
    expect(weak.score_label).toBe('Needs significant work');
  });

  it('flags a known cliché opener', () => {
    const { comments } = analyzeSopText(CLICHE_WEAK_ESSAY);
    expect(comments.some((c) => c.dimension === 'originality' && /cliché/.test(c.issue))).toBe(true);
  });

  it('does not flag a cliché opener on an essay that does not open with one', () => {
    const { comments } = analyzeSopText(STRONG_ESSAY);
    expect(comments.some((c) => c.dimension === 'originality' && /opening line/.test(c.issue))).toBe(false);
  });

  it('rewards essays with quantified, named detail on specificity', () => {
    const weak = analyzeSopText(CLICHE_WEAK_ESSAY);
    const strong = analyzeSopText(STRONG_ESSAY);
    expect(strong.scores.specificity).toBeGreaterThan(weak.scores.specificity);
  });

  it('flags essays under the word-count floor', () => {
    const { comments, word_count: wordCount } = analyzeSopText('Too short to say anything meaningful.');
    expect(wordCount).toBeLessThan(400);
    expect(comments.some((c) => /word floor/.test(c.issue))).toBe(true);
  });

  it('is deterministic — same input always produces the same score', () => {
    const first = analyzeSopText(STRONG_ESSAY);
    const second = analyzeSopText(STRONG_ESSAY);
    expect(first.overall_score).toBe(second.overall_score);
  });

  it('handles empty input without throwing, and flags it as under the word floor', () => {
    let result;
    expect(() => { result = analyzeSopText(''); }).not.toThrow();
    expect(result.word_count).toBe(0);
    expect(result.comments.some((c) => /word floor/.test(c.issue))).toBe(true);
  });
});

describe('analyzeSopText Common App prompt alignment (essayType=undergraduate only)', () => {
  const CHALLENGE_ESSAY = `The engine stalled twice during the qualifying run, and I had thirty minutes to find the problem before the team's slot closed. I traced it to a corroded sensor lead I had installed myself the week before, a mistake I had to own in front of six teammates who had trusted me with that subsystem. That failure taught me to double-check my own work as carefully as I check everyone else's, a habit that has stayed with me since.`;

  const OFF_TOPIC_ESSAY = `I have always loved painting landscapes on quiet Sunday mornings, mixing colors until the light on the canvas matches the light outside my window. Each piece takes me somewhere different, and I keep every finished canvas stacked against my studio wall.`;

  it('does not flag prompt alignment when no commonAppPromptId is given', () => {
    const { comments } = analyzeSopText(OFF_TOPIC_ESSAY, 'undergraduate');
    expect(comments.some((c) => /Common App Prompt/.test(c.issue))).toBe(false);
  });

  it('does not flag an essay that contains language matching the selected prompt', () => {
    const { comments } = analyzeSopText(CHALLENGE_ESSAY, 'undergraduate', 2); // Prompt 2: challenge/setback/failure
    expect(comments.some((c) => /Common App Prompt/.test(c.issue))).toBe(false);
  });

  it('flags an essay with no language matching the selected prompt', () => {
    const { comments } = analyzeSopText(OFF_TOPIC_ESSAY, 'undergraduate', 2);
    expect(comments.some((c) => /Common App Prompt 2/.test(c.issue))).toBe(true);
  });

  it('never checks prompt alignment for a non-undergraduate essayType, even if a promptId is passed', () => {
    const { comments } = analyzeSopText(OFF_TOPIC_ESSAY, 'graduate', 2);
    expect(comments.some((c) => /Common App Prompt/.test(c.issue))).toBe(false);
  });

  it('does not flag prompt 7 (any topic) since it has no fixed theme to check against', () => {
    const { comments } = analyzeSopText(OFF_TOPIC_ESSAY, 'undergraduate', 7);
    expect(comments.some((c) => /Common App Prompt/.test(c.issue))).toBe(false);
  });
});
