// Canonical essay/rubric-type vocabulary — a document's essay_type must be one of these.
// 'general' is this app's original single rubric (see ai-engine/sopRubric.js SOP_DIMENSIONS)
// and stays the default for backward compatibility; the other six mirror rubrics published
// at https://gradpilot.com/rubrics for that specific application type (fetched August 2026;
// see sopRubric.js for the exact source URL and dimension text cited per type).
export const ESSAY_TYPES = [
  { value: 'general', label: 'General statement of purpose / essay' },
  { value: 'undergraduate', label: 'Undergraduate (Common App narrative essay)' },
  { value: 'graduate', label: "Graduate / Master's statement of purpose" },
  { value: 'phd', label: 'PhD statement of purpose' },
  { value: 'uk_undergraduate', label: 'UK undergraduate (UCAS personal statement)' },
  { value: 'scholarship', label: 'Scholarship application essay' },
  { value: 'fellowship', label: 'Fellowship application essay' },
];

export const ESSAY_TYPE_VALUES = ESSAY_TYPES.map((t) => t.value);

export const DEFAULT_ESSAY_TYPE = 'general';
