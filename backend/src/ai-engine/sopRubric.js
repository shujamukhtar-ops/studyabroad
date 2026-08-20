// Statement-of-purpose grading rubric, grounded in published guidance from graduate
// admissions offices and university writing centers rather than invented from scratch.
// Sources consulted (August 2026):
//   - Columbia SIPA admissions blog, "Top 3 mistakes in a graduate application personal
//     statement" — resume-recap, over-describing the problem instead of yourself, treating
//     grad school as a "logical next step" instead of showing genuine intellectual interest.
//   - Cornell CIPA admissions blog — same three failure modes, plus generic/untailored
//     statements that could be sent to any program unchanged.
//   - University of Alabama Dept. of History, "Advice for Writing a Strong Statement of
//     Purpose" and Emory University Writing Center's personal-statement guide — "show, don't
//     tell": concrete anecdotes and named projects beat unsupported adjectives
//     ("hardworking", "passionate") every time.
//   - CollegeVine and Stanford's "5 College Essay Clichés" — cliché openings that read as
//     generic to an admissions reader: "Ever since I was a child...", dictionary-definition
//     openers, opening on a famous quote, and sweeping generalizations ("Education is the
//     key to success.", "In today's world, ...").
//   - InGenius Prep and other structure guides — a strong statement has a clear
//     introduction/body/conclusion arc built around a single thematic thread, not a loose
//     chronology; essays that lack structure lose the reader in the first paragraph.
//   - Northeastern University Graduate School / GradPilot word-count surveys — most SOPs run
//     500-1,000 words; below ~400 words there usually isn't room to cover research interest,
//     preparation, program fit, and goals; above ~1,200 words editors start cutting for focus.
//
// This rubric backs two different code paths that must stay aligned: the prompt text sent
// to a real LLM provider (see analyzeStructural.js / analyzePersonalized.js) instructs the
// model to grade against these exact dimensions, and the heuristic engine in
// heuristics/analyzeSopText.js computes the same dimensions directly from the text for the
// mock/dev provider, which has no live model to call. Neither path is a substitute for
// human judgment or a real writing-center review — see the caveat in analyzeSopText.js.
//
// SOP_DIMENSIONS/SOP_SCORE_BANDS below back the 'general' entry in ESSAY_RUBRICS further
// down this file, which also holds six application-type-specific rubrics (undergraduate,
// graduate, PhD, UK undergraduate, scholarship, fellowship) sourced from GradPilot — see the
// comment above ESSAY_RUBRICS for how those are structured and where they diverge from this
// generic one.

export const SOP_DIMENSIONS = [
  {
    key: 'specificity',
    label: 'Specificity & evidence',
    description:
      'Concrete anecdotes, named projects/experiences, and quantified detail, rather than unsupported ' +
      'claims about being "passionate" or "hardworking" — the single most-cited distinguisher between a ' +
      'strong and weak statement in admissions guidance ("show, don\'t tell").',
    weight: 0.25,
  },
  {
    key: 'structure',
    label: 'Structure & clarity',
    description:
      'A clear introduction/body/conclusion arc organized around one thematic thread, with a forward-looking ' +
      'close — not a loose chronological resume-walkthrough.',
    weight: 0.2,
  },
  {
    key: 'originality',
    label: 'Originality (avoids clichés)',
    description:
      'Avoids stock openings ("Ever since I was a child...", dictionary definitions, famous-person quotes) ' +
      'and sweeping generalizations that could open any applicant\'s essay.',
    weight: 0.2,
  },
  {
    key: 'goal_clarity',
    label: 'Goals & fit',
    description:
      'States concrete post-program goals and ties them to why this field/program specifically, rather than ' +
      'framing grad study as a vague "logical next step".',
    weight: 0.2,
  },
  {
    key: 'grammar',
    label: 'Mechanics',
    description:
      'Free of the kind of surface errors (run-on sentences, repeated words, missing punctuation) that read ' +
      'as an unproofread draft.',
    weight: 0.15,
  },
];

export const SOP_SCORE_BANDS = [
  { max: 39, label: 'Needs significant work' },
  { max: 59, label: 'Developing' },
  { max: 79, label: 'Strong' },
  { max: 100, label: 'Excellent' },
];

export function scoreLabelFor(overallScore) {
  return SOP_SCORE_BANDS.find((band) => overallScore <= band.max)?.label ?? 'Excellent';
}

// Openings that admissions guidance repeatedly flags as generic — matched against roughly
// the first sentence of the essay.
export const CLICHE_OPENERS = [
  /^ever since i (was a child|can remember)/i,
  /^for as long as i can remember/i,
  /^according to (webster|merriam-webster|the dictionary|oxford dictionary)/i,
  /^the definition of \w+ is/i,
  /^as .{2,40} once said/i,
  /^little did i know/i,
  /^life is full of surprises/i,
];

// Sweeping generalizations that can appear anywhere in the essay, not just the opening.
export const GENERIC_PHRASES = [
  /education is the key to success/i,
  /in today'?s (world|society|fast-paced world)/i,
  /since the dawn of/i,
  /throughout (human )?history/i,
  /i want to change the world/i,
];

// Unsupported self-description adjectives — a high density of these with no anecdote nearby
// is exactly the "tell, don't show" pattern the sources above call out.
export const GENERIC_SELF_ADJECTIVES = [
  'passionate', 'passion', 'hardworking', 'hard-working', 'dedicated', 'driven',
  'unique', 'innovative', 'diverse', 'motivated', 'ambitious', 'determined',
];

export const FORWARD_LOOKING_PHRASES = [
  /\bi (plan|intend|aim|hope|aspire) to\b/i,
  /\bmy (goal|aspiration|ambition) is\b/i,
  /\bafter (completing|graduat\w+)\b/i,
  /\bin the (long|short) term\b/i,
  /\blooking forward\b/i,
];

export const RESUME_RECAP_MARKERS = [
  /\bi (graduated|worked as|was employed|served as|held the position)\b/i,
];

// Representative field vocabulary for the app's canonical major-tag vocabulary
// (backend/src/constants/majors.js) — used to check whether an essay's content plausibly
// engages with the applicant's stated intended major, as a lightweight fit signal for the
// personalized (premium) stage. Not exhaustive; a false negative here should read as "no
// signal found," never as "this essay is off-topic."
export const MAJOR_KEYWORDS = {
  computer_science: ['algorithm', 'software', 'programming', 'code', 'data', 'system', 'computing', 'engineer', 'ai', 'machine learning'],
  software_engineering: ['software', 'code', 'architecture', 'testing', 'deploy', 'engineer', 'system design', 'debugging'],
  data_science: ['data', 'model', 'statistics', 'analysis', 'machine learning', 'python', 'dataset', 'prediction'],
  artificial_intelligence: ['machine learning', 'neural network', 'model', 'algorithm', 'ai', 'data', 'training'],
  information_technology: ['network', 'infrastructure', 'system', 'support', 'administration', 'security'],
  cybersecurity: ['security', 'vulnerability', 'network', 'encryption', 'threat', 'penetration testing'],

  engineering: ['design', 'system', 'prototype', 'build', 'mechanical', 'circuit', 'materials', 'technical', 'lab'],
  mechanical_engineering: ['design', 'prototype', 'mechanical', 'thermodynamics', 'manufacturing', 'cad'],
  electrical_engineering: ['circuit', 'signal', 'electronics', 'power', 'embedded', 'semiconductor'],
  civil_engineering: ['structural', 'infrastructure', 'construction', 'design', 'materials', 'survey'],
  chemical_engineering: ['process', 'reaction', 'chemical', 'plant', 'materials', 'thermodynamics'],
  aerospace_engineering: ['aerodynamics', 'propulsion', 'flight', 'design', 'structural', 'spacecraft'],
  biomedical_engineering: ['biomedical', 'device', 'clinical', 'design', 'biology', 'prosthetic'],
  industrial_engineering: ['process', 'optimization', 'systems', 'efficiency', 'operations', 'logistics'],
  environmental_engineering: ['sustainability', 'water', 'pollution', 'design', 'environmental', 'remediation'],
  materials_science: ['materials', 'properties', 'synthesis', 'characterization', 'nanomaterials'],

  business: ['market', 'strategy', 'management', 'finance', 'venture', 'operations', 'entrepreneur', 'consult'],
  finance: ['investment', 'portfolio', 'valuation', 'markets', 'capital', 'risk', 'financial modeling'],
  accounting: ['audit', 'financial statements', 'tax', 'ledger', 'compliance', 'reporting'],
  marketing: ['brand', 'campaign', 'consumer', 'market research', 'advertising', 'positioning'],
  management: ['leadership', 'team', 'strategy', 'operations', 'organization'],
  entrepreneurship: ['startup', 'venture', 'founder', 'pitch', 'business model', 'launch'],
  human_resources: ['talent', 'recruiting', 'organizational', 'culture', 'employee'],
  supply_chain_management: ['logistics', 'inventory', 'procurement', 'operations', 'distribution'],
  international_business: ['global', 'trade', 'market entry', 'cross-cultural', 'international'],

  economics: ['policy', 'market', 'econometric', 'data', 'model', 'analysis', 'trade', 'growth'],
  political_science: ['policy', 'government', 'institutions', 'political', 'governance', 'elections'],
  international_relations: ['diplomacy', 'foreign policy', 'international', 'geopolitics', 'treaty'],
  public_policy: ['policy', 'government', 'reform', 'public sector', 'legislation'],
  sociology: ['society', 'social', 'community', 'inequality', 'research', 'culture'],
  anthropology: ['culture', 'fieldwork', 'ethnography', 'society', 'human'],
  psychology: ['behavior', 'cognitive', 'mental health', 'research', 'therapy', 'psychological'],
  criminology: ['crime', 'justice', 'policy', 'law enforcement', 'criminal'],
  geography: ['spatial', 'mapping', 'gis', 'environment', 'urban', 'region'],

  law: ['legal', 'law', 'justice', 'policy', 'court', 'advocacy', 'rights', 'litigation'],

  biology: ['cell', 'organism', 'research', 'lab', 'genetics', 'molecular', 'biology'],
  chemistry: ['reaction', 'synthesis', 'lab', 'molecule', 'compound', 'chemical'],
  physics: ['theory', 'experiment', 'quantum', 'mechanics', 'lab', 'research'],
  environmental_science: ['ecosystem', 'sustainability', 'climate', 'conservation', 'environment'],
  earth_science: ['geology', 'earth', 'mineral', 'field research', 'seismic'],
  astronomy: ['astrophysics', 'telescope', 'stellar', 'observation', 'cosmology'],
  marine_science: ['ocean', 'marine', 'ecosystem', 'coastal', 'aquatic'],

  mathematics: ['proof', 'theorem', 'analysis', 'abstract', 'model', 'research'],
  statistics: ['data', 'model', 'probability', 'analysis', 'regression', 'inference'],
  actuarial_science: ['risk', 'probability', 'insurance', 'model', 'financial'],

  medicine: ['clinical', 'patient', 'diagnosis', 'medical', 'healthcare', 'physician'],
  nursing: ['patient', 'clinical', 'care', 'healthcare', 'nursing'],
  public_health: ['community health', 'epidemiology', 'policy', 'population', 'prevention'],
  pharmacy: ['drug', 'medication', 'pharmacology', 'clinical', 'patient'],
  dentistry: ['dental', 'clinical', 'patient', 'oral health'],
  veterinary_medicine: ['animal', 'clinical', 'veterinary', 'care'],
  physical_therapy: ['rehabilitation', 'patient', 'clinical', 'therapy', 'movement'],
  nutrition: ['diet', 'nutrition', 'health', 'clinical', 'food'],
  health_administration: ['healthcare', 'administration', 'policy', 'management', 'hospital'],

  english_literature: ['literature', 'narrative', 'text', 'analysis', 'writing', 'author'],
  history: ['historical', 'research', 'archive', 'primary source', 'era'],
  philosophy: ['argument', 'ethics', 'theory', 'logic', 'philosophical'],
  linguistics: ['language', 'syntax', 'phonetics', 'semantics', 'linguistic'],
  religious_studies: ['religion', 'theology', 'tradition', 'faith', 'text'],
  classics: ['ancient', 'latin', 'greek', 'classical', 'literature'],

  modern_languages: ['language', 'fluency', 'culture', 'translation', 'immersion'],
  asian_studies: ['culture', 'region', 'language', 'history', 'asia'],
  european_studies: ['culture', 'region', 'policy', 'history', 'europe'],

  fine_arts: ['studio', 'exhibition', 'medium', 'portfolio', 'artistic'],
  graphic_design: ['design', 'visual', 'typography', 'portfolio', 'branding'],
  architecture: ['design', 'structure', 'studio', 'urban', 'blueprint'],
  interior_design: ['space', 'design', 'furnishing', 'layout', 'aesthetic'],
  fashion_design: ['design', 'textile', 'collection', 'garment', 'fashion'],
  film_studies: ['film', 'production', 'narrative', 'cinematography', 'directing'],
  music: ['performance', 'composition', 'instrument', 'ensemble', 'music'],
  theatre_performing_arts: ['performance', 'stage', 'production', 'theatre', 'acting'],
  photography: ['photograph', 'image', 'composition', 'portfolio', 'camera'],

  communications: ['communication', 'audience', 'message', 'media', 'strategy'],
  journalism: ['reporting', 'story', 'newsroom', 'investigative', 'article'],
  media_studies: ['media', 'audience', 'production', 'culture', 'platform'],
  public_relations: ['media', 'campaign', 'brand', 'communications', 'press'],
  advertising: ['campaign', 'brand', 'creative', 'consumer', 'advertising'],

  education: ['teaching', 'classroom', 'curriculum', 'student', 'pedagogy'],
  early_childhood_education: ['classroom', 'child development', 'teaching', 'curriculum'],
  special_education: ['classroom', 'student', 'individualized', 'inclusion', 'support'],

  agriculture: ['crop', 'farming', 'agricultural', 'soil', 'sustainability'],
  environmental_studies: ['environment', 'sustainability', 'policy', 'ecosystem', 'conservation'],
  forestry: ['forest', 'conservation', 'ecosystem', 'land management'],
  sustainability: ['sustainability', 'environment', 'renewable', 'climate', 'conservation'],

  social_work: ['community', 'client', 'advocacy', 'social service', 'case'],
};

export const IDEAL_WORD_RANGE = { min: 500, max: 1000, hardFloor: 400, hardCeiling: 1300 };

// --- Per-application-type rubrics, sourced from GradPilot (https://gradpilot.com/rubrics) ---
//
// GradPilot publishes a separate scored rubric per application type rather than one generic
// SOP rubric — dimension names, what each looks for, and even whether a forward-looking
// closing is a strength (graduate/PhD/scholarship/fellowship) or a weakness (a Common App
// narrative essay explicitly flags "ending with a college-focused pitch" as a mistake) differ
// by type. The six below were fetched from GradPilot's site in August 2026 — one representative
// rubric per category the user asked for, since each category itself lists many prompt-specific
// variants (e.g. Common App alone has 12): the Narrative Craft rubric for undergraduate (its
// dimensions apply to any Common App personal essay regardless of which of the 7 prompts is
// used), the generic MS SOP for graduate, the generic PhD SOP, the UCAS Personal Statement for
// UK undergraduate, the Chevening rubric for scholarship, and the NSF GRFP Personal Statement
// rubric for fellowship. GradPilot's pages don't publish per-dimension point weights or score
// bands, so each dimension below is weighted equally within its rubric, and SOP_SCORE_BANDS
// (above) is reused as the overall 0-100 band scale for every type.
//
// Each dimension also carries a `signal` — which of this file's five original SOP_DIMENSIONS
// keys (specificity / structure / originality / goal_clarity / grammar) its score is computed
// from. heuristics/analyzeSopText.js has no live model call, so it cannot independently judge
// e.g. "Faculty Alignment and Program Ecosystem" from first principles the way a real LLM
// reading the full rubric text can — instead it reuses whichever of the five underlying,
// content-derived signals is the closest real proxy (here, named-entity detection, since
// faculty alignment is fundamentally about naming specific people). Multiple named dimensions
// legitimately sharing one underlying signal is a known, stated approximation of this coarse
// heuristic path, not a bug — see analyzeStructural.js, which sends the full literal rubric
// text (all dimension names and descriptions) to a real LLM provider, which scores each
// dimension independently rather than through this signal-sharing shortcut.
//
// A 'mechanics' dimension is appended to every type below even though it isn't one of
// GradPilot's own named dimensions for any of these six rubrics (they're all content/craft
// rubrics, not proofreading checklists) — proofreading quality is still worth surfacing for
// any essay type, and this app already had a solid heuristic for it.
export const ESSAY_RUBRICS = {
  general: {
    label: 'General statement of purpose / essay',
    sourceUrl: null,
    rewardForwardLookingClose: true,
    wordRange: IDEAL_WORD_RANGE,
    commonMistakes: [],
    dimensions: SOP_DIMENSIONS.map((d) => ({ key: d.key, label: d.label, description: d.description, signal: d.key })),
  },

  undergraduate: {
    label: 'Undergraduate (Common App — Narrative Craft)',
    sourceUrl: 'https://gradpilot.com/rubrics/common-app/common-app-personal-essay-narrative-craft',
    // GradPilot explicitly flags "ending with a college-focused pitch or a generic, sweeping
    // moral" as a mistake for this type — the opposite of graduate/PhD/scholarship/fellowship
    // SOPs, where stating forward-looking goals is rewarded. See scoreStructure/scoreGoalClarity
    // in analyzeSopText.js, which both branch on this flag.
    rewardForwardLookingClose: false,
    wordRange: { min: 250, max: 650, hardFloor: 200, hardCeiling: 750 },
    commonMistakes: [
      'Attempting to cover your entire life instead of one bounded moment',
      'Skipping crucial story development by summarizing instead of showing',
      'Including irrelevant descriptive details',
      'Stating a lesson without demonstrating how it was earned',
      'Ending with a college-focused pitch or a generic, sweeping moral',
    ],
    dimensions: [
      { key: 'one_main_moment', label: 'One Main Moment', description: 'Whether the essay chooses a bounded event that can carry the whole piece.', signal: 'structure' },
      { key: 'staying_inside_scene', label: 'Staying Inside the Scene', description: 'Whether the crucial part of the event unfolds through actions, choices, and observations rather than being skipped in summary.', signal: 'specificity' },
      { key: 'details_that_change_story', label: 'Details That Change the Story', description: 'Whether concrete details do narrative work: establishing pressure, revealing a relationship, triggering a choice, or changing the meaning of a later line.', signal: 'specificity' },
      { key: 'what_causes_the_turn', label: 'What Causes the Turn', description: "Whether the story's change follows from what happens on the page.", signal: 'structure' },
      { key: 'meaning_before_moral', label: 'Meaning Before the Moral', description: 'Whether meaning grows from the narrated moment before the essay names it.', signal: 'originality' },
      { key: 'ending_that_belongs_here', label: 'An Ending That Belongs Here', description: 'Whether the ending grows from the main moment, completes its emotional or intellectual movement, and stops before turning into a college pitch or universal moral.', signal: 'structure' },
      { key: 'mechanics', label: 'Mechanics', description: 'Free of run-on sentences, repeated words, and other surface errors that read as an unproofread draft. (App-added — not one of GradPilot\'s named craft dimensions.)', signal: 'grammar' },
    ],
  },

  graduate: {
    label: "Graduate / Master's (MS/MA Statement of Purpose)",
    sourceUrl: 'https://gradpilot.com/rubrics/graduate/ms-sop-generic',
    rewardForwardLookingClose: true,
    wordRange: { min: 1000, max: 1200, hardFloor: 800, hardCeiling: 1400 },
    commonMistakes: [
      "Delayed openings that obscure the applicant's purpose — state graduate aims early",
      'Vague goals — name specific problems, theories, or research questions',
      'Program fit argued from reputation alone instead of concrete program details',
      'Experience listed without reflecting on what was learned from it',
      'Generic tone, stock language, and unsupported claims',
    ],
    dimensions: [
      { key: 'introduction_and_purpose', label: 'Introduction and Purpose', description: "Whether the opening frames the applicant's purpose with clarity, stakes, and a motivating hook.", signal: 'structure' },
      { key: 'academic_goals_intellectual_interests', label: 'Academic Goals and Intellectual Interests', description: 'Specificity and ambition of academic goals, including research questions, subfields, and curiosities.', signal: 'goal_clarity' },
      { key: 'program_fit_and_knowledge', label: 'Program Fit and Knowledge', description: "How convincingly the applicant demonstrates knowledge of the target program's offerings and rationale.", signal: 'specificity' },
      { key: 'evidence_of_preparedness_relevance', label: 'Evidence of Preparedness and Relevance', description: 'How convincingly the applicant showcases academic, research, or professional experiences that predict success.', signal: 'specificity' },
      { key: 'personalization_and_tailoring', label: 'Personalization and Tailoring', description: "The essay's bespoke nature — how uniquely it speaks to this university, program, and narrative.", signal: 'originality' },
      { key: 'writing_authenticity_and_voice', label: 'Writing Authenticity and Voice', description: "Whether the essay's register stays consistent with a single real author, and its details ring true.", signal: 'originality' },
      { key: 'research_experience_career_vision', label: 'Research Experience, Career Vision, and Long-Term Plans', description: 'How coherently the applicant links past research/work to graduate study and future impact.', signal: 'goal_clarity' },
      { key: 'personal_growth_character_community', label: 'Personal Growth, Character, and Community Contribution', description: 'How the essay conveys personal qualities, resilience, and planned contributions to the academic community.', signal: 'specificity' },
      { key: 'mechanics', label: 'Mechanics', description: 'Free of run-on sentences, repeated words, and other surface errors that read as an unproofread draft. (App-added.)', signal: 'grammar' },
    ],
  },

  phd: {
    label: 'PhD Statement of Purpose',
    sourceUrl: 'https://gradpilot.com/rubrics/phd/phd-sop-generic',
    rewardForwardLookingClose: true,
    wordRange: { min: 1000, max: 1200, hardFloor: 800, hardCeiling: 1400 },
    commonMistakes: [],
    dimensions: [
      { key: 'research_trajectory_and_purpose', label: 'Research Trajectory and Purpose', description: 'Whether the opening establishes a concrete research direction, weighable stakes, and a clear reason to pursue the PhD specifically.', signal: 'structure' },
      { key: 'research_experience_intellectual_evolution', label: 'Research Experience and Intellectual Evolution', description: "The depth, independence, and methodological sophistication of prior research — whether the applicant's record demonstrates ability to conduct independent doctoral research.", signal: 'specificity' },
      { key: 'research_vision_and_questions', label: 'Research Vision and Questions', description: 'How well the applicant articulates specific research questions, connects them to their own research record, and situates them in current scholarship.', signal: 'goal_clarity' },
      { key: 'faculty_alignment_program_ecosystem', label: 'Faculty Alignment and Program Ecosystem', description: 'Whether the applicant has identified specific, active faculty in the target department whose current work genuinely connects to the proposed research.', signal: 'specificity' },
      { key: 'academic_preparation_technical_mastery', label: 'Academic Preparation and Technical Mastery', description: 'Whether coursework, technical skills, and theoretical grounding equip the applicant for doctoral-level research in the stated direction.', signal: 'specificity' },
      { key: 'scholarly_contribution_impact_potential', label: 'Scholarly Contribution and Impact Potential', description: "The originality and bounded significance of the applicant's proposed contribution to the field.", signal: 'originality' },
      { key: 'training_plan_funding_career_trajectory', label: 'Training Plan, Funding Awareness, and Career Trajectory', description: 'How the applicant plans to leverage doctoral training — courses, mentoring, funding — to build toward a specific, sustainable path after the degree.', signal: 'goal_clarity' },
      { key: 'writing_quality_scholarly_voice', label: 'Writing Quality and Scholarly Voice', description: "Whether the SOP's register matches how faculty actually read it — a peer-to-peer research pitch, not personal narrative or marketing appeal.", signal: 'originality' },
      { key: 'mechanics', label: 'Mechanics', description: 'Free of run-on sentences, repeated words, and other surface errors that read as an unproofread draft. (App-added.)', signal: 'grammar' },
    ],
  },

  uk_undergraduate: {
    label: 'UK Undergraduate (UCAS Personal Statement)',
    sourceUrl: 'https://gradpilot.com/rubrics/ucas/ucas-personal-statement',
    // UCAS's own mistake list explicitly warns against tailoring to one university (a single
    // statement goes to every UCAS choice at once) — it's not about post-course career goals.
    rewardForwardLookingClose: false,
    // GradPilot states this as a character limit (4,000 total across three answers, 350
    // minimum per answer), not a word count — this app grades one continuous text, so the
    // range below is an approximate words-equivalent conversion, not a GradPilot-stated number.
    wordRange: { min: 550, max: 750, hardFloor: 350, hardCeiling: 800 },
    commonMistakes: [
      'Tailoring the statement to one specific university (UCAS statements go to every choice at once)',
      'Using "passion" without concrete explanation',
      'Creating lists of activities instead of demonstrating preparation',
      'Citing broad skills without supporting evidence',
      'Repeating the same examples across multiple answers',
    ],
    dimensions: [
      { key: 'course_direction_subject_interest', label: 'Course Direction and Subject Interest', description: 'What question, idea, problem, text, method, observation, or future use draws the student to their chosen course.', signal: 'specificity' },
      { key: 'preparation_learning_action', label: 'Preparation Through Learning and Action', description: 'How formal study and activity outside education serve as preparation for the selected course.', signal: 'specificity' },
      { key: 'what_evidence_shows', label: 'What the Evidence Shows', description: 'Whether the student interprets study and experience rather than attaching skill labels to a list.', signal: 'specificity' },
      { key: 'each_answer_does_its_job', label: 'Each Answer Does Its Job', description: 'Whether every submitted answer performs the jobs in its question without using another answer or unseen application field.', signal: 'structure' },
      { key: 'one_statement_without_repetition', label: 'One Statement Without Repetition', description: 'Contradiction, repeated evidence, and the relationship among the submitted UCAS answers.', signal: 'originality' },
      { key: 'mechanics', label: 'Mechanics', description: 'Free of run-on sentences, repeated words, and other surface errors that read as an unproofread draft. (App-added.)', signal: 'grammar' },
    ],
  },

  scholarship: {
    label: 'Scholarship Application Essay (Chevening)',
    sourceUrl: 'https://gradpilot.com/rubrics/scholarship/scholarship-chevening',
    rewardForwardLookingClose: true,
    wordRange: { min: 600, max: 1200, hardFloor: 400, hardCeiling: 1200 },
    commonMistakes: [
      'Relying on titles rather than demonstrating concrete decisions and results',
      'Naming contacts without explaining collaborative contributions',
      'Selecting courses based on prestige instead of specific skill-building needs',
      'Making vague career promises without practical pathways',
      'Repeating identical examples across multiple answers',
    ],
    dimensions: [
      { key: 'leadership_through_decisions_results', label: 'Leadership Through Decisions and Results', description: "Whether the applicant demonstrates leadership and influence through a decision, a route that affected another person's action or a shared decision, and a visible result.", signal: 'specificity' },
      { key: 'relationships_that_produce_results', label: 'Relationships That Produce Results', description: 'Whether responses show how the applicant built or maintained a professional relationship and how collaboration produced a visible result.', signal: 'specificity' },
      { key: 'course_choice_as_skills_plan', label: 'Course Choice as a Skills Plan', description: "Whether answers connect the first-choice course to the applicant's background, needed skills, career direction, and a challenge named by the study question.", signal: 'goal_clarity' },
      { key: 'career_steps_positive_change', label: 'Career Steps and Positive Change', description: 'Whether responses separate short-, mid-, and long-term career steps and connect them to bounded positive change.', signal: 'goal_clarity' },
      { key: 'each_answer_does_its_job', label: 'Each Answer Does Its Job', description: 'Whether every submitted answer performs the jobs in its question without using another answer or unseen application field.', signal: 'structure' },
      { key: 'one_case_without_repetition', label: 'One Case Without Repetition', description: 'Contradiction, repeated evidence, and the relationship among the submitted scholarship answers.', signal: 'originality' },
      { key: 'mechanics', label: 'Mechanics', description: 'Free of run-on sentences, repeated words, and other surface errors that read as an unproofread draft. (App-added.)', signal: 'grammar' },
    ],
  },

  fellowship: {
    label: 'Fellowship Application Essay (NSF GRFP Personal Statement)',
    sourceUrl: 'https://gradpilot.com/rubrics/scholarship/scholarship-nsf-grfp-personal-statement',
    rewardForwardLookingClose: true,
    wordRange: IDEAL_WORD_RANGE,
    commonMistakes: [
      'Relying on trait words without concrete evidence',
      'Making vague societal-impact claims',
      'Describing experiences without demonstrating growth',
      'Leaving personal contributions ambiguous or relying on titles instead of direct explanation',
    ],
    dimensions: [
      { key: 'intellectual_merit_through_experience', label: 'Intellectual Merit Through Experience', description: "Whether the statement makes a visible Intellectual Merit case from the applicant's experiences and future research potential.", signal: 'specificity' },
      { key: 'broader_impacts_through_action', label: 'Broader Impacts Through Action', description: 'Whether the statement makes a visible Broader Impacts case through a beneficiary, activity, and route to a bounded societal outcome.', signal: 'specificity' },
      { key: 'background_research_growth', label: 'Background and Research Growth', description: "Whether the statement explains how relevant experiences shaped the applicant's research interests, choices, or preparation.", signal: 'structure' },
      { key: 'your_part_in_the_work', label: 'Your Part in the Work', description: 'Whether the statement shows what the applicant personally did, decided, interpreted, or produced in the preparation experiences.', signal: 'specificity' },
      { key: 'graduate_study_career_direction', label: 'Graduate Study and Career Direction', description: 'Whether the statement explains how graduate education supports a feasible research and career direction.', signal: 'goal_clarity' },
      { key: 'one_fellowship_case', label: 'One Fellowship Case', description: 'Whether the statement connects its background, Intellectual Merit, Broader Impacts, and future direction into one applicant-specific fellowship case.', signal: 'originality' },
      { key: 'mechanics', label: 'Mechanics', description: 'Free of run-on sentences, repeated words, and other surface errors that read as an unproofread draft. (App-added.)', signal: 'grammar' },
    ],
  },
};

export { ESSAY_TYPES, ESSAY_TYPE_VALUES, DEFAULT_ESSAY_TYPE } from '../constants/essayTypes.js';
