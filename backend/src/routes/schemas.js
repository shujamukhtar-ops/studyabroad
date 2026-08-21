import { z } from 'zod';
import { MAJOR_TAG_VALUES } from '../constants/majors.js';
import { ESSAY_TYPE_VALUES } from '../constants/essayTypes.js';
import { COMMON_APP_PROMPT_IDS } from '../constants/commonAppPrompts.js';
import { COUNTRY_VALUES, DEGREE_LEVEL_VALUES } from '../constants/countries.js';
import { TEST_TYPES_BY_KEY, TEST_TYPE_VALUES } from '../constants/testTypes.js';
import { EXTRACURRICULAR_CATEGORY_VALUES, EXTRACURRICULAR_TIER_VALUES } from '../constants/extracurriculars.js';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  homeCountry: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// One entry per test the student has taken (a student can report both a GRE and an IELTS
// score, for example) — replaces an earlier, completely unstructured `z.record(z.any())`
// shape that accepted any JSON at all. `sections`/`total` are checked against the specific
// test's own scale (constants/testTypes.js TEST_TYPES) in the superRefine below, since each
// test's valid ranges are different and zod's static object schema can't express "the min/max
// depends on the value of a sibling field."
const testScoreEntrySchema = z
  .object({
    test: z.enum(TEST_TYPE_VALUES),
    sections: z.record(z.number()).default({}),
    total: z.number().optional(),
    testDate: z.string().optional(),
  })
  .superRefine((entry, ctx) => {
    const testType = TEST_TYPES_BY_KEY[entry.test];

    for (const [key, value] of Object.entries(entry.sections)) {
      const section = testType.sections.find((s) => s.key === key);
      if (!section) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections', key], message: `'${key}' is not a section of ${testType.label}.` });
        continue;
      }
      if (value < section.min || value > section.max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections', key], message: `${section.label} must be between ${section.min} and ${section.max}.` });
      }
    }

    if (testType.totalMode === 'manual' || testType.totalMode === 'single') {
      if (entry.total !== undefined && (entry.total < testType.totalMin || entry.total > testType.totalMax)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['total'], message: `${testType.totalLabel} must be between ${testType.totalMin} and ${testType.totalMax}.` });
      }
    }
  });

// One entry per achievement the Achievements tab collects. `tier` is the student's own
// honest self-placement on the CollegeVine-style 4-tier scale (constants/extracurriculars.js)
// — this app has no way to independently verify an activity's real-world impact, so the
// heuristic fit engine (ai-engine/admissionFitEngine.js) necessarily trusts what's reported
// here the same way a human admissions reader trusts what's written in an application.
const extracurricularEntrySchema = z.object({
  category: z.enum(EXTRACURRICULAR_CATEGORY_VALUES),
  tier: z.enum(EXTRACURRICULAR_TIER_VALUES),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
});

// researchPublications/workExperienceYears live alongside extracurriculars rather than as
// one more activity entry because they're counted quantities the fit engine weighs
// differently (see admissionFitEngine.js computeHolisticIndex), not tiered self-assessments.
const holisticProfileSchema = z
  .object({
    extracurriculars: z.array(extracurricularEntrySchema).max(20).default([]),
    researchPublications: z.number().int().min(0).max(100).optional(),
    workExperienceYears: z.number().min(0).max(50).optional(),
  })
  .default({});

export const profileSchema = z.object({
  targetCountries: z.array(z.enum(COUNTRY_VALUES)).default([]),
  intendedMajor: z.enum(MAJOR_TAG_VALUES).optional(),
  degreeLevel: z.enum(DEGREE_LEVEL_VALUES).optional(),
  targetIntake: z.string().optional(),
  budgetRange: z.enum(['<15k', '15-30k', '30-50k', '50k+']).optional(),
  gpa: z.number().min(0).max(4.5).optional(),
  testScores: z.array(testScoreEntrySchema).default([]),
  holisticProfile: holisticProfileSchema,
});

// There's only one document type ('essay', set server-side in documentService) — sop and
// essay were never a meaningful distinction, and transcripts were never analyzed
// differently, so there's nothing for the caller to specify here.
// rawText is optional because a multipart upload carries the content as req.file instead —
// documentService.uploadDocument requires at least one of the two to be present and throws
// NO_CONTENT_PROVIDED otherwise, since that check depends on req.file, which this schema
// (validating req.body only) can't see.
// essayType picks which rubric (see constants/essayTypes.js / ai-engine/sopRubric.js
// ESSAY_RUBRICS) the essay is graded against; optional and defaults to 'general' in
// documentService so existing callers that don't send it keep the original behavior.
// commonAppPromptId only means anything when essayType='undergraduate' (the Common App, a
// US-specific system — see constants/commonAppPrompts.js); silently unused otherwise, same as
// how essayType itself is ignored past validation for a caller that doesn't need it.
// z.coerce.number() (not z.number()) because a multipart file-upload request sends this as a
// string form field, same reason essayType above is validated as a string enum either way.
export const documentUploadSchema = z.object({
  rawText: z.string().min(1).optional(),
  essayType: z.enum(ESSAY_TYPE_VALUES).optional(),
  commonAppPromptId: z.coerce.number().int().refine((n) => COMMON_APP_PROMPT_IDS.includes(n)).optional(),
});
