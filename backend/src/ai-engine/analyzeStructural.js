import { getProvider } from './provider.js';
import { ESSAY_RUBRICS, DEFAULT_ESSAY_TYPE, SOP_SCORE_BANDS } from './sopRubric.js';
import { commonAppPromptById, COMMON_APP_PROMPT_TIPS } from '../constants/commonAppPrompts.js';

const MODEL_VERSION = 'structural-rubric-v3';

const BAND_TEXT = SOP_SCORE_BANDS.map((b, i) => {
  const min = i === 0 ? 0 : SOP_SCORE_BANDS[i - 1].max + 1;
  return `${min}-${b.max}: "${b.label}"`;
}).join(', ');

function buildRubricText(rubric) {
  return rubric.dimensions.map((d) => `  - "${d.key}" (${d.label}): ${d.description}`).join('\n');
}

function buildMistakesText(rubric) {
  if (!rubric.commonMistakes.length) return '';
  return `\nCommon mistakes flagged for this application type:\n${rubric.commonMistakes.map((m) => `  - ${m}`).join('\n')}\n`;
}

// Both tiers get this. Cheap, no profile lookup, no retrieval — keeps the basic tier's
// per-request cost near zero. `provider` defaults to the configured AIProvider but can be
// injected in tests without touching env vars.
//
// The rubric injected below is not arbitrary — for essayType='general' it's the one encoded
// in sopRubric.js's SOP_DIMENSIONS; for the seven application-type-specific values it's the
// matching GradPilot rubric (see ESSAY_RUBRICS in sopRubric.js for sources and the mapping to
// heuristics/analyzeSopText.js's coarser signal-based approximation used for the mock/dev
// provider). Keeping one real LLM provider and the deterministic mock provider aligned to the
// same criteria means switching AI_PROVIDER changes depth and nuance, not which things get
// graded — though a real LLM given the full rubric text here can score each named dimension
// independently, which the mock path's signal-sharing approximation cannot.
// commonAppPromptId only applies when resolvedEssayType === 'undergraduate' (the Common App is
// a US-specific system with 7 fixed prompts — see constants/commonAppPrompts.js and
// constants/essayCountryGuidance.js) and is silently ignored otherwise, same as a UK/graduate/
// PhD applicant simply never being asked which prompt they used. Injecting the actual prompt
// text (rather than just its number) lets the model judge whether the essay genuinely responds
// to *this* prompt specifically, not just narrative craft in the abstract — the Narrative Craft
// rubric's dimensions (one_main_moment, what_causes_the_turn, ...) already ask the right
// questions, this just gives the model the concrete prompt to check them against.
// COMMON_APP_PROMPT_TIPS (also from commonAppPrompts.js, sourced from College Essay Guy's
// per-prompt example critiques) is appended alongside the prompt text — not a scored dimension
// of its own, just extra grading context (e.g. Prompt 2 specifically rewards a strong hook and
// real vulnerability; Prompt 6 tolerates more structural risk than the others).
export async function analyzeStructural(text, essayType = DEFAULT_ESSAY_TYPE, provider = getProvider(), commonAppPromptId = null) {
  const rubric = ESSAY_RUBRICS[essayType] ?? ESSAY_RUBRICS[DEFAULT_ESSAY_TYPE];
  const resolvedEssayType = ESSAY_RUBRICS[essayType] ? essayType : DEFAULT_ESSAY_TYPE;
  const scoreShapeText = rubric.dimensions.map((d) => `"${d.key}": 0-10`).join(', ');

  const selectedPrompt = resolvedEssayType === 'undergraduate' ? commonAppPromptById(commonAppPromptId) : null;
  const promptTips = selectedPrompt ? COMMON_APP_PROMPT_TIPS[selectedPrompt.id] ?? [] : [];
  const promptTipsText = promptTips.length
    ? ` This prompt tends to reward, in particular: ${promptTips.join(' ')}`
    : '';
  const promptContextText = selectedPrompt
    ? `\nThe student selected Common App Prompt ${selectedPrompt.id}: "${selectedPrompt.text}". As part of grading the dimensions above, judge whether the essay genuinely responds to this specific prompt — not just narrative craft in general.${promptTipsText}\n`
    : '';

  const prompt = `STAGE=structural
ESSAY_TYPE=${resolvedEssayType}${selectedPrompt ? `\nCOMMON_APP_PROMPT_ID=${selectedPrompt.id}` : ''}
You are grading a student's ${rubric.label}${rubric.sourceUrl ? ` against the rubric published at ${rubric.sourceUrl}` : ''}. Grade structure and mechanics — not whether the underlying achievements themselves are impressive.
${promptContextText}
Rubric dimensions (score each 0-10):
${buildRubricText(rubric)}
${buildMistakesText(rubric)}
Return ONLY valid JSON matching this shape, no prose outside the JSON:

{
  "scores": { ${scoreShapeText} },
  "overall_score": 0-100 (the unweighted average of the scores above, scaled to 100 — GradPilot doesn't publish per-dimension weights for this rubric, so weight every dimension equally),
  "score_label": one of ${BAND_TEXT} based on overall_score,
  "word_count": integer word count of the essay,
  "comments": [ { "dimension": "the exact dimension key from the list above", "severity": "low"|"medium"|"high", "issue": "specific, actionable issue quoting or locating the problem" } ],
  "strengths": [ "specific things the essay already does well" ],
  "overall_summary": "2-3 sentences of natural, professional feedback, written for the student — do not mention the rubric's name or source, that this is an automated/heuristic analysis, or any internal scoring mechanics"
}

Essay:
"""
${text}
"""`;

  const raw = await provider.invoke(prompt, { maxTokens: 1200 });
  const analysis = JSON.parse(raw);
  // Stamped here rather than requested from the model, so the caller always knows which
  // rubric actually produced this analysis regardless of what the provider echoed back.
  analysis.essay_type = resolvedEssayType;
  analysis.rubric_label = rubric.label;

  return { analysis, modelVersion: MODEL_VERSION };
}
