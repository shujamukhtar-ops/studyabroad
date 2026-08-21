// Adds the 'motivation_letter' essay type (see ai-engine/sopRubric.js ESSAY_RUBRICS,
// constants/essayTypes.js) and common_app_prompt_id — which of the 7 official Common App
// essay prompts (constants/commonAppPrompts.js) the student was responding to, only
// meaningful when essay_type = 'undergraduate'. Nullable and unconstrained to a specific
// range here (validated at the request layer instead — see routes/schemas.js) since a
// document graded against any other essay_type simply never sets it, same as a UK/graduate/
// PhD applicant never being asked which Common App prompt they used.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE documents DROP CONSTRAINT documents_essay_type_check;
    ALTER TABLE documents ADD CONSTRAINT documents_essay_type_check
      CHECK (essay_type IN ('general', 'undergraduate', 'graduate', 'phd', 'uk_undergraduate', 'motivation_letter', 'scholarship', 'fellowship'));
    ALTER TABLE documents ADD COLUMN common_app_prompt_id SMALLINT;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE documents DROP COLUMN common_app_prompt_id;
    ALTER TABLE documents DROP CONSTRAINT documents_essay_type_check;
    ALTER TABLE documents ADD CONSTRAINT documents_essay_type_check
      CHECK (essay_type IN ('general', 'undergraduate', 'graduate', 'phd', 'uk_undergraduate', 'scholarship', 'fellowship'));
  `);
}
