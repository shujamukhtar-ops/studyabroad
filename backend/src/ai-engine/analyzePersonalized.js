import { getProvider } from './provider.js';
import { MAJOR_KEYWORDS, ESSAY_RUBRICS, DEFAULT_ESSAY_TYPE } from './sopRubric.js';

const MODEL_VERSION = 'personalized-feedback-v2';

// Baseline accepted/rejected essays retrieved by essayExampleRepository.findSimilarExamples
// (nearest by embedding cosine distance, filtered to the student's intended_major) get
// rendered as an XML block so the model can ground fit_score and rewrite_suggestions in
// concrete precedent rather than its own unaided judgment of "what admissions wants."
function buildBaselineExamplesBlock(retrievedExamples) {
  if (!retrievedExamples.length) return '';

  const examplesBlock = retrievedExamples
    .map(
      (ex) =>
        `<Example outcome="${ex.outcome}"><EssayText>${ex.text}</EssayText><AdmissionsCommitteeNotes>${ex.notes}</AdmissionsCommitteeNotes></Example>`
    )
    .join('');

  return `\n<BaselineExamples>${examplesBlock}</BaselineExamples>

Calculate fit_score and write rewrite_suggestions by comparing the student's essay to the
successes and failures in the baseline examples provided. Ground your critique in whether
they show the same specificity as the "accepted" examples or fall into the traps of the
"rejected" ones.\n`;
}

// Premium only. Takes the Stage 1 structural output as context rather than re-deriving it,
// so this stage's prompt (and cost) stays focused on personalization, not re-grading grammar.
export async function analyzePersonalized(text, profile, structuralAnalysis, retrievedExamples = [], provider = getProvider()) {
  const major = profile.intended_major ?? null;
  const majorKeywordHint = major && MAJOR_KEYWORDS[major]
    ? `Representative vocabulary for this field, as a loose signal only (its absence doesn't mean the essay is off-topic — a student can write a strong, on-topic essay without using any of these exact words): ${MAJOR_KEYWORDS[major].join(', ')}.`
    : 'No representative vocabulary list available for this major.';

  // Threaded through structuralAnalysis.essay_type (stamped by analyzeStructural.js) rather
  // than a new parameter here, so this function's signature doesn't need to change.
  const essayType = structuralAnalysis?.essay_type ?? DEFAULT_ESSAY_TYPE;
  const rubric = ESSAY_RUBRICS[essayType] ?? ESSAY_RUBRICS[DEFAULT_ESSAY_TYPE];
  const essayTypeContext = `This is a ${rubric.label}${rubric.sourceUrl ? ` — see ${rubric.sourceUrl} for the rubric it was structurally graded against` : ''}. Calibrate rewrite guidance to what this specific application type's readers look for.`;

  const baselineExamplesBlock = buildBaselineExamplesBlock(retrievedExamples);

  const prompt = `STAGE=personalized
${essayTypeContext}
Given this student's profile and their essay's structural feedback, give specific rewrite
suggestions tailored to what admissions committees in their intended field actually look
for, and assess how well the essay currently engages with that field. Return ONLY valid
JSON matching this shape:

{
  "fit_score": 0-10, one decimal place (how clearly the essay's content engages with the student's stated intended major and goals — not a judgment of the major itself),
  "rewrite_suggestions": [ { "dimension": "the rubric dimension this suggestion is about", "original": "exact quote from the essay this suggestion refers to", "suggestion": "specific rewrite guidance", "rationale": "why this matters to an admissions reader in this field" } ],
  "target_school_alignment_notes": "1-3 sentences"
}

Student profile:
- Target countries: ${(profile.target_countries ?? []).join(', ') || 'unspecified'}
- Intended major: ${major ?? 'unspecified'}
- Budget range: ${profile.budget_range ?? 'unspecified'}

${majorKeywordHint}
${baselineExamplesBlock}
Structural feedback already given:
${JSON.stringify(structuralAnalysis)}

Essay:
"""
${text}
"""`;

  const raw = await provider.invoke(prompt, { maxTokens: 1200 });
  const analysis = JSON.parse(raw);

  return { analysis, modelVersion: MODEL_VERSION };
}
