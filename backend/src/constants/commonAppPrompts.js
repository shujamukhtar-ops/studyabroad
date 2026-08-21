// The 7 official Common App essay prompts for the 2025-2026 application cycle, fetched
// verbatim from https://www.commonapp.org/blog/announcing-2025-2026-common-app-essay-prompts
// (the same set carries into 2026-2027 unchanged — Common App confirmed the prompts didn't
// change year over year). Only relevant to essayType='undergraduate' (see sopRubric.js's
// ESSAY_RUBRICS.undergraduate, GradPilot's Common App Narrative Craft rubric), which is itself
// a US-specific application system — see constants/essayCountryGuidance.js for why a UK/
// Canada/Australia/Netherlands/Germany applicant shouldn't be grading against this at all.
export const COMMON_APP_PROMPTS = [
  {
    id: 1,
    text: 'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.',
  },
  {
    id: 2,
    text: 'The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?',
  },
  {
    id: 3,
    text: 'Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?',
  },
  {
    id: 4,
    text: 'Reflect on something that someone has done for you that has made you happy or thankful in a surprising way. How has this gratitude affected or motivated you?',
  },
  {
    id: 5,
    text: 'Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.',
  },
  {
    id: 6,
    text: 'Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time.',
  },
  {
    id: 7,
    text: "Share an essay on any topic of your choice. It can be one you've already written, one that responds to a different prompt, or one of your own design.",
  },
];

export const COMMON_APP_PROMPT_IDS = COMMON_APP_PROMPTS.map((p) => p.id);
export const COMMON_APP_WORD_LIMIT = 650;

export function commonAppPromptById(id) {
  return COMMON_APP_PROMPTS.find((p) => p.id === id) ?? null;
}

// A rough thematic keyword set per prompt, for the heuristic (mock/dev) grading path in
// heuristics/analyzeSopText.js to check whether an essay's content plausibly engages with the
// *specific* prompt the student selected — not full language understanding (that requires a
// real LLM call, which analyzeStructural.js makes separately with the actual prompt text), just
// a coarse "does this essay contain any vocabulary you'd expect from a response to this prompt"
// signal, in the same spirit as sopRubric.js's MAJOR_KEYWORDS. Prompt 7 (any topic) has no
// keyword set since it has no fixed theme to check against.
export const COMMON_APP_PROMPT_KEYWORDS = {
  1: ['background', 'identity', 'culture', 'family', 'heritage', 'talent', 'community', 'grew up', 'raised'],
  2: ['challenge', 'obstacle', 'setback', 'failure', 'failed', 'struggle', 'difficult', 'overcome', 'mistake'],
  3: ['questioned', 'challenged', 'belief', 'disagree', 'changed my mind', 'assumption', 'perspective', 'rethink'],
  4: ['grateful', 'gratitude', 'thankful', 'kindness', 'surprised', 'generous', 'helped me'],
  5: ['grew', 'growth', 'realized', 'realization', 'accomplishment', 'understanding', 'matured', 'changed'],
  6: ['engaging', 'curious', 'curiosity', 'fascinated', 'lose track of time', 'obsessed', 'hobby', 'passion project'],
};
