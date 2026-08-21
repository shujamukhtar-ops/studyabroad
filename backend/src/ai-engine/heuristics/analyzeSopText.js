// Deterministic, rubric-grounded SOP scoring — no live model call. This is what actually
// powers analysis under MockProvider (local dev / tests / no AWS credentials configured);
// it is NOT a substitute for a real writing-center review or a language model's judgment.
// overall_summary is deliberately written in plain, student-facing language rather than
// disclosing that this pass is heuristic/automated — that caveat belongs in developer-facing
// docs (see README.md "AI provider"), not in the feedback text itself. Its purpose is to make
// dev-mode feedback genuinely vary with what the student wrote, grounded in the same rubric
// (see sopRubric.js) that the prompt sent to a real LLM provider is instructed to apply — so
// upgrading AI_PROVIDER from 'mock' to a real provider changes accuracy and nuance, not which
// criteria are used.
//
// Known limitations, stated plainly rather than glossed over: this cannot do real grammar
// checking (no parser/model — only surface pattern checks like run-ons and repeated words),
// cannot verify factual claims in the essay, and cliché/generic-phrase detection is a fixed
// list, not language understanding — a well-written essay using none of these exact patterns
// will simply not be penalized on originality, not proof it's original.

import {
  ESSAY_RUBRICS,
  DEFAULT_ESSAY_TYPE,
  scoreLabelFor,
  CLICHE_OPENERS,
  GENERIC_PHRASES,
  GENERIC_SELF_ADJECTIVES,
  FORWARD_LOOKING_PHRASES,
} from '../sopRubric.js';
import { commonAppPromptById, COMMON_APP_PROMPT_KEYWORDS } from '../../constants/commonAppPrompts.js';

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function countWords(text) {
  return (text.match(/[A-Za-z'-]+/g) ?? []).length;
}

function stdev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(n, min = 0, max = 10) {
  return Math.max(min, Math.min(max, n));
}

function scoreSpecificity(text, words, comments, strengths) {
  const numberMatches = text.match(/\b\d[\d,]*(\.\d+)?%?\b/g) ?? [];
  // Capitalized multi-word runs, e.g. "Genomics Research Lab", as a proxy for named
  // projects/organizations — a real named-entity recognizer would do better, but requires a
  // model call this path deliberately doesn't make. Imprecise at sentence starts (a sentence
  // beginning "Software Engineering..." reads the same as a title), which is an accepted
  // approximation, not a correctness bug, for a signal this coarse.
  const namedEntityMatches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/g) ?? [];

  const lowerWords = text.toLowerCase().match(/[a-z'-]+/g) ?? [];
  const genericAdjectiveHits = GENERIC_SELF_ADJECTIVES.reduce(
    (count, adj) => count + lowerWords.filter((w) => w === adj).length,
    0
  );
  const genericDensityPer100 = words > 0 ? (genericAdjectiveHits / words) * 100 : 0;

  let score = 4 + Math.min(3, numberMatches.length * 0.5) + Math.min(3, namedEntityMatches.length * 0.3);
  score -= Math.min(4, genericDensityPer100 * 1.5);
  score = clamp(score);

  if (genericAdjectiveHits >= 3) {
    comments.push({
      dimension: 'specificity',
      severity: 'high',
      issue: `Relies on unsupported self-description words like "${GENERIC_SELF_ADJECTIVES.find((a) => lowerWords.includes(a))}" ` +
        `${genericAdjectiveHits} time(s) without an anecdote attached — admissions readers consistently rate concrete ` +
        'examples over claimed traits ("show, don\'t tell").',
    });
  }
  if (numberMatches.length === 0 && namedEntityMatches.length === 0) {
    comments.push({
      dimension: 'specificity',
      severity: 'medium',
      issue: 'No quantified detail or named projects/organizations found — naming a specific course, ' +
        'lab, competition, or outcome makes claims verifiable and memorable.',
    });
  } else if (numberMatches.length + namedEntityMatches.length >= 4) {
    strengths.push('Grounded in specific, checkable detail (named projects, numbers, or outcomes) rather than generalities.');
  }
  return score;
}

function scoreStructure(text, paragraphs, sentences, comments, strengths, rewardForwardLookingClose) {
  let score = 5;
  if (paragraphs.length < 3) {
    score -= 2;
    comments.push({
      dimension: 'structure',
      severity: 'medium',
      issue: `Only ${paragraphs.length} paragraph break(s) found — a clear introduction/body/conclusion arc is ` +
        'easier for a reader to follow and remember than one long block.',
    });
  } else if (paragraphs.length >= 4 && paragraphs.length <= 7) {
    score += 2;
    strengths.push('Organized into a readable number of paragraphs rather than one dense block or dozens of fragments.');
  }

  // Whether a forward-looking closing statement is a strength or a weakness depends on the
  // essay type — a grad/PhD/scholarship/fellowship SOP should end on concrete plans, but
  // GradPilot's Common App narrative-craft rubric explicitly flags ending on a "college pitch"
  // as a mistake, and UCAS statements aren't framed around post-course career goals at all.
  if (rewardForwardLookingClose) {
    const lastParagraph = paragraphs[paragraphs.length - 1] ?? '';
    const hasForwardLookingClose = FORWARD_LOOKING_PHRASES.some((re) => re.test(lastParagraph));
    if (hasForwardLookingClose) {
      score += 2;
      strengths.push('Closes with a forward-looking statement of goals rather than trailing off.');
    } else {
      comments.push({
        dimension: 'structure',
        severity: 'medium',
        issue: 'The closing paragraph doesn\'t clearly state what comes next — ending on concrete future goals ' +
          'gives the statement a resolved arc instead of just stopping.',
      });
    }
  }

  const sentenceLengths = sentences.map((s) => countWords(s)).filter((n) => n > 0);
  const lengthVariance = stdev(sentenceLengths);
  if (sentenceLengths.length >= 4 && lengthVariance < 2.5) {
    score -= 1;
    comments.push({
      dimension: 'structure',
      severity: 'low',
      issue: 'Sentences are fairly uniform in length, which can read as monotonous — varying sentence length ' +
        'helps emphasize key moments.',
    });
  }

  return clamp(score);
}

function scoreOriginality(text, sentences, comments, strengths) {
  let score = 10;
  const firstSentence = sentences[0] ?? '';
  const openerHit = CLICHE_OPENERS.find((re) => re.test(firstSentence.trim()));
  if (openerHit) {
    score -= 4;
    comments.push({
      dimension: 'originality',
      severity: 'high',
      issue: `The opening line ("${firstSentence.slice(0, 80)}${firstSentence.length > 80 ? '…' : ''}") matches a ` +
        'well-known cliché pattern admissions readers see often — starting with a specific scene or moment ' +
        'reads as more original than a stock opener.',
    });
  }
  const genericHits = GENERIC_PHRASES.filter((re) => re.test(text));
  if (genericHits.length > 0) {
    score -= Math.min(4, genericHits.length * 2);
    comments.push({
      dimension: 'originality',
      severity: 'medium',
      issue: `Contains ${genericHits.length} sweeping generalization(s) (e.g. "in today's world...") that could ` +
        'open any applicant\'s essay — grounding the same point in a personal specific would land harder.',
    });
  }
  if (!openerHit && genericHits.length === 0) {
    strengths.push('Avoids the most common cliché openings and generic sweeping statements.');
  }
  return clamp(score);
}

function scoreGoalClarity(text, comments, strengths, rewardForwardLookingClose) {
  // No dimension in a rubric with rewardForwardLookingClose=false maps to this signal (see
  // ESSAY_RUBRICS in sopRubric.js) — a neutral placeholder avoids surfacing a "no goals
  // stated" comment on an essay type where that isn't actually expected feedback.
  if (!rewardForwardLookingClose) return 5;

  let score = 4;
  const forwardHits = FORWARD_LOOKING_PHRASES.filter((re) => re.test(text)).length;
  score += Math.min(4, forwardHits * 2);
  if (forwardHits === 0) {
    comments.push({
      dimension: 'goal_clarity',
      severity: 'high',
      issue: 'No clear statement of post-program goals found — admissions readers specifically look for concrete ' +
        'plans, not just stated interest in the field.',
    });
  } else {
    strengths.push('States a concrete post-program goal rather than leaving intent implicit.');
  }
  return clamp(score);
}

function scoreGrammar(text, sentences, comments, strengths) {
  let score = 10;
  const repeatedWordHits = (text.match(/\b(\w+)\s+\1\b/gi) ?? []).length;
  const runOnCount = sentences.filter((s) => countWords(s) > 55).length;
  const doubleSpaceCount = (text.match(/ {2,}/g) ?? []).length;

  if (repeatedWordHits > 0) {
    score -= repeatedWordHits;
    comments.push({
      dimension: 'grammar',
      severity: 'low',
      issue: `Found ${repeatedWordHits} immediately-repeated word(s) (e.g. "the the") — likely an editing slip.`,
    });
  }
  if (runOnCount > 0) {
    score -= runOnCount * 1.5;
    comments.push({
      dimension: 'grammar',
      severity: 'medium',
      issue: `${runOnCount} sentence(s) run past 55 words — consider splitting for readability.`,
    });
  }
  if (doubleSpaceCount > 2) {
    score -= 1;
  }
  if (repeatedWordHits === 0 && runOnCount === 0) {
    strengths.push('No obvious run-on sentences or repeated-word slips.');
  }
  return clamp(score);
}

// Coarse "does this essay engage with the specific Common App prompt the student picked"
// check — a keyword-overlap heuristic, not language understanding (see the file-level caveat
// above and commonAppPrompts.js's COMMON_APP_PROMPT_KEYWORDS comment for why this is
// deliberately approximate). Only ever called for essayType='undergraduate'; prompt 7 ("any
// topic of your choice") has no fixed theme, so there's nothing to check it against. Pushes at
// most a low/medium-severity comment — absence of a keyword hit is a soft "make sure this
// engages the prompt" nudge, not proof the essay is off-topic.
function scorePromptAlignment(text, commonAppPromptId, comments) {
  if (!commonAppPromptId) return;
  const prompt = commonAppPromptById(commonAppPromptId);
  const keywords = COMMON_APP_PROMPT_KEYWORDS[commonAppPromptId];
  if (!prompt || !keywords) return;

  const lower = text.toLowerCase();
  const hasHit = keywords.some((kw) => lower.includes(kw));
  if (!hasHit) {
    comments.push({
      dimension: 'structure',
      severity: 'medium',
      issue: `This essay is graded against Common App Prompt ${commonAppPromptId} ("${prompt.text}") but doesn't contain ` +
        'language typically associated with that prompt — double-check that the story you\'re telling actually ' +
        'answers what this specific prompt asks, not just that it\'s a well-told story in general.',
    });
  }
}

function joinNaturally(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function analyzeSopText(text, essayType = DEFAULT_ESSAY_TYPE, commonAppPromptId = null) {
  const rubric = ESSAY_RUBRICS[essayType] ?? ESSAY_RUBRICS[DEFAULT_ESSAY_TYPE];
  const resolvedEssayType = ESSAY_RUBRICS[essayType] ? essayType : DEFAULT_ESSAY_TYPE;
  const wordRange = rubric.wordRange;

  const trimmed = (text ?? '').trim();
  const words = countWords(trimmed);
  const sentences = splitSentences(trimmed);
  const paragraphs = splitParagraphs(trimmed);
  const comments = [];
  const strengths = [];

  // The five underlying signals this heuristic can actually compute from text alone — every
  // rubric dimension below is backed by whichever of these is the closest real proxy (see the
  // `signal` field on each ESSAY_RUBRICS dimension, and the comment above ESSAY_RUBRICS for why).
  const rawSignals = {
    specificity: scoreSpecificity(trimmed, words, comments, strengths),
    structure: scoreStructure(trimmed, paragraphs, sentences, comments, strengths, rubric.rewardForwardLookingClose),
    originality: scoreOriginality(trimmed, sentences, comments, strengths),
    goal_clarity: scoreGoalClarity(trimmed, comments, strengths, rubric.rewardForwardLookingClose),
    grammar: scoreGrammar(trimmed, sentences, comments, strengths),
  };

  if (resolvedEssayType === 'undergraduate') {
    scorePromptAlignment(trimmed, commonAppPromptId, comments);
  }

  if (words < wordRange.hardFloor) {
    comments.push({
      dimension: 'structure',
      severity: 'high',
      issue: `At ${words} words, this is well under the ~${wordRange.hardFloor}-word floor expected for a ${rubric.label}.`,
    });
  } else if (words > wordRange.hardCeiling) {
    comments.push({
      dimension: 'structure',
      severity: 'medium',
      issue: `At ${words} words, this runs well past the typical ${wordRange.min}-${wordRange.max}-word range for a ` +
        `${rubric.label} — most readers want focus over length, and this length invites cuts.`,
    });
  }

  // Present the raw signals through the selected rubric's actual named dimensions: the
  // `scores` object is keyed by rubric dimension (not raw signal), and each comment tagged
  // with a raw signal key gets remapped to the first rubric dimension backed by that signal,
  // so feedback reads as being about "Faculty Alignment and Program Ecosystem" rather than the
  // generic "specificity" it's actually computed from.
  const firstDimensionKeyForSignal = {};
  for (const dim of rubric.dimensions) {
    if (!(dim.signal in firstDimensionKeyForSignal)) firstDimensionKeyForSignal[dim.signal] = dim.key;
  }
  const scores = {};
  for (const dim of rubric.dimensions) {
    // Round to 1 decimal place — the raw signal computations involve fractional additions
    // (e.g. 0.3 per named entity) that otherwise surface as floating-point noise like 4.8999999999999995.
    scores[dim.key] = Math.round(rawSignals[dim.signal] * 10) / 10;
  }
  const remappedComments = comments.map((c) => ({
    ...c,
    dimension: firstDimensionKeyForSignal[c.dimension] ?? c.dimension,
  }));

  const overallScore = Math.round(
    10 * rubric.dimensions.reduce((sum, dim) => sum + rawSignals[dim.signal] / rubric.dimensions.length, 0)
  );

  return {
    essay_type: resolvedEssayType,
    rubric_label: rubric.label,
    scores,
    overall_score: overallScore,
    score_label: scoreLabelFor(overallScore),
    word_count: words,
    comments: remappedComments,
    strengths,
    overall_summary:
      `This review looked at ${joinNaturally(rubric.dimensions.map((d) => d.label.toLowerCase()))}. ` +
      'Use it as a starting point for revision, not a final judgment on the essay.',
  };
}
