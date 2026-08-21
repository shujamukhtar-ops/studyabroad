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

// Prompt-specific craft advice, quoted from College Essay Guy's worked-example critiques
// (collegeessayguy.com/blog/common-app-essay-prompts, fetched August 2026) rather than
// invented — each prompt's response tends to reward a slightly different emphasis even though
// every response is graded against the same Narrative Craft dimensions in sopRubric.js
// (e.g. a Prompt 2 essay especially needs a strong hook and real vulnerability; a Prompt 6
// essay can take more creative/structural risks). Injected into the real-LLM prompt in
// analyzeStructural.js alongside the selected prompt's text, as extra grading context — not a
// separate scored dimension, and not used by the mock/dev heuristic path (which has no way to
// judge "does this show real craft" from pattern-matching alone). Prompt 7 (any topic) has no
// fixed theme, so its tips are about topic choice and voice rather than content.
export const COMMON_APP_PROMPT_TIPS = {
  1: ['Find a thematic thread rather than listing facts about the background/identity/talent.', 'Show — don\'t just state — the values that background reveals.'],
  2: ['Start with a strong hook that drops the reader into the moment, not a summary of it.', 'Be genuinely vulnerable about the setback rather than narrating it from a safe emotional distance.'],
  3: ['Demonstrate craft in how the story of changing one\'s mind is told, not just that it happened.', 'Show real insight and growth — the reader should see the thinking change, not just be told it did.'],
  4: ['Dig into specific sensory/concrete details of the moment of gratitude rather than describing it in general terms.', 'Use questions or reflection to explore why the gratitude affected you, rather than just asserting that it did.'],
  5: ['Use structure deliberately to make the accomplishment/realization easy to follow.', 'Keep bringing the focus back to the applicant, even when describing an event, team, or other people.'],
  6: ['This prompt tolerates more creative risk in structure or voice than the others — an unconventional format can work if the topic itself is genuinely engaging.', 'Specific, even "geeky," field-specific language reads as more authentic engagement than generic enthusiasm.'],
  7: ['Choose a topic you\'re genuinely, personally interested in — this prompt has no built-in theme, so authenticity of interest has to carry it.', 'Humor can work well here if it\'s natural to the writer\'s voice, but forced humor reads worse than no humor at all.'],
};
