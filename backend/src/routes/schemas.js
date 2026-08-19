import { z } from 'zod';
import { MAJOR_TAG_VALUES } from '../constants/majors.js';
import { ESSAY_TYPE_VALUES } from '../constants/essayTypes.js';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  homeCountry: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  targetCountries: z.array(z.string()).default([]),
  intendedMajor: z.enum(MAJOR_TAG_VALUES).optional(),
  targetIntake: z.string().optional(),
  budgetRange: z.enum(['<15k', '15-30k', '30-50k', '50k+']).optional(),
  gpa: z.number().min(0).max(4.5).optional(),
  testScores: z.record(z.any()).default({}),
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
export const documentUploadSchema = z.object({
  rawText: z.string().min(1).optional(),
  essayType: z.enum(ESSAY_TYPE_VALUES).optional(),
});
