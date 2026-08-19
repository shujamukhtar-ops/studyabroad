// Deterministic responses for local dev / tests — never calls a network. For the SOP
// analysis stages this is not a fixed fixture: it runs the real rubric-based heuristic
// engine (heuristics/analyzeSopText.js) against whatever essay text the prompt actually
// contains, so dev-mode feedback genuinely varies with what the student wrote instead of
// returning the same canned scores for every essay. See analyzeStructural.js/
// analyzePersonalized.js for how the prompt text (and therefore what a real LLM provider
// would be instructed to do) is kept aligned with the same rubric.
import { analyzeSopText } from './heuristics/analyzeSopText.js';
import { MAJOR_KEYWORDS } from './sopRubric.js';

function extractEssayText(prompt) {
  const match = prompt.match(/Essay:\n"""\n([\s\S]*)\n"""$/);
  return match ? match[1] : '';
}

function extractEssayType(prompt) {
  const match = prompt.match(/ESSAY_TYPE=(\S+)/);
  return match ? match[1] : undefined;
}

function extractField(prompt, label) {
  const match = prompt.match(new RegExp(`${label}: (.+)`));
  return match ? match[1].trim() : null;
}

function computeFitScore(text, major) {
  const keywords = MAJOR_KEYWORDS[major];
  if (!keywords) return null;
  const lower = text.toLowerCase();
  const hits = keywords.filter((kw) => lower.includes(kw)).length;
  // 2 base + up to 8 for keyword coverage — a loose lexical signal, not a real
  // understanding of whether the essay's substance fits the field (see analyzePersonalized.js).
  return Math.min(10, 2 + hits * 1.5);
}

// The structural heuristic pass doesn't track exact essay spans per issue (see
// analyzeSopText.js), so there's no real quote to put in `original` here — unlike a real
// LLM provider, which can and should quote the actual essay text per the shape
// analyzePersonalized.js's prompt asks for. `original` is left null rather than filled with
// a fabricated or metadata-stuffed placeholder; FeedbackCard.jsx renders `dimension` and
// `severity` as a proper label instead.
function rewriteSuggestionsFromStructural(structuralAnalysis) {
  const comments = Array.isArray(structuralAnalysis?.comments) ? structuralAnalysis.comments : [];
  return comments
    .filter((c) => c.severity === 'high' || c.severity === 'medium')
    .slice(0, 3)
    .map((c) => ({
      dimension: c.dimension ?? null,
      severity: c.severity,
      original: null,
      suggestion: c.issue,
      rationale: 'Based on the structural review of this essay.',
    }));
}

export const MockProvider = {
  async invoke(prompt) {
    if (prompt.includes('STAGE=structural')) {
      const essay = extractEssayText(prompt);
      const essayType = extractEssayType(prompt);
      return JSON.stringify(analyzeSopText(essay, essayType));
    }

    if (prompt.includes('STAGE=personalized')) {
      const essay = extractEssayText(prompt);
      const major = extractField(prompt, 'Intended major');
      const structuralMatch = prompt.match(/Structural feedback already given:\n(\{[\s\S]*?\})\n\nEssay:/);
      const structuralAnalysis = structuralMatch ? JSON.parse(structuralMatch[1]) : {};

      const fitScore = major && major !== 'unspecified' ? computeFitScore(essay, major) : null;
      const suggestions = rewriteSuggestionsFromStructural(structuralAnalysis);

      return JSON.stringify({
        fit_score: fitScore,
        rewrite_suggestions: suggestions,
        target_school_alignment_notes:
          fitScore === null
            ? 'Set an intended major on your profile to get a field-specific fit assessment.'
            : fitScore >= 7
              ? `The essay's vocabulary engages clearly with ${major.replace('_', ' ')} — keep the same level of concrete, field-specific detail as you revise.`
              : `The essay doesn't strongly signal ${major.replace('_', ' ')} specifically yet — naming courses, tools, or projects tied to the field would strengthen the connection to your stated major.`,
      });
    }

    if (prompt.includes('STAGE=ranking')) {
      // Echo back the actual candidate ids the prompt was given, rather than a fixed
      // placeholder — rankCandidates() strictly filters output to known candidate ids,
      // so a hardcoded fake id here would silently zero out every result in dev/tests.
      const match = prompt.match(/Candidate schools[^:]*:\n(\[.*\])$/s);
      const candidates = match ? JSON.parse(match[1]) : [];
      const ranked = candidates.map((c, i) => ({
        id: c.id,
        score: Math.max(0, 1 - i * 0.05),
        reasoning: `Mock ranking: placed by input order (${c.name ?? c.id}).`,
      }));
      return JSON.stringify({ ranked });
    }

    return JSON.stringify({ note: 'MockProvider: unrecognized stage, returning empty response.' });
  },
};
