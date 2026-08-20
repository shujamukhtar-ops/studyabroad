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

function keywordHits(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

function computeFitScore(text, major) {
  const keywords = MAJOR_KEYWORDS[major];
  if (!keywords) return null;
  const hits = keywordHits(text, keywords).length;
  // 2 base + up to 8 for keyword coverage — a loose lexical signal, not a real
  // understanding of whether the essay's substance fits the field (see analyzePersonalized.js).
  return Math.min(10, 2 + hits * 1.5);
}

// Deliberately independent of structuralAnalysis.comments — those cover grammar, structure,
// clichés, and mechanics, and reusing them here (an earlier version of this function did) made
// the personalized stage feel like a duplicate of the structural "To improve" list instead of
// adding anything new. This instead looks only at whether the essay's vocabulary actually
// engages the student's stated major, which the structural pass never checks, and points out
// the specific field-relevant terms missing from the essay so the suggestion is concrete
// rather than generic ("be more specific"). `original` is left null (unlike a real LLM
// provider, which quotes actual essay text per analyzePersonalized.js's prompt) because this
// heuristic isn't tied to a specific span of the essay.
function fitSuggestionsFromKeywords(text, major, fitScore) {
  const keywords = MAJOR_KEYWORDS[major];
  if (!keywords || fitScore === null) return [];

  const majorLabel = major.replace(/_/g, ' ');
  if (fitScore >= 7) {
    return [
      {
        dimension: 'field-specific evidence',
        severity: 'low',
        original: null,
        suggestion: `Keep grounding your interest in ${majorLabel} with the same level of concrete, field-specific detail throughout the rest of the essay.`,
        rationale: `The essay already uses vocabulary and examples an admissions reader in ${majorLabel} would recognize as genuine engagement with the field.`,
      },
    ];
  }

  const missing = keywords.filter((kw) => !keywordHits(text, keywords).includes(kw)).slice(0, 3);
  return [
    {
      dimension: 'field-specific evidence',
      severity: 'medium',
      original: null,
      suggestion: `Name a specific course, project, tool, or experience tied to ${majorLabel} rather than describing your interest in general terms — for example, something involving ${missing.slice(0, 2).join(' or ')}.`,
      rationale: `Right now the essay reads as though it could apply to several different majors; concrete, field-specific detail is what tells an admissions reader in ${majorLabel} that this interest is real.`,
    },
    {
      dimension: 'goal-major alignment',
      severity: 'medium',
      original: null,
      suggestion: `Connect your stated goals directly to an outcome in ${majorLabel} — a problem you want to work on or a skill you want to build in that field.`,
      rationale: `Admissions readers weigh how clearly your goals require this specific major, not just any major.`,
    },
  ];
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

      const fitScore = major && major !== 'unspecified' ? computeFitScore(essay, major) : null;
      const suggestions = major && major !== 'unspecified' ? fitSuggestionsFromKeywords(essay, major, fitScore) : [];

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
