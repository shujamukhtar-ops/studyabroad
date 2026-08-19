import {
  countUserDocumentsByType,
  createDocument,
  findDocumentById,
  listDocumentsByUser,
} from '../repositories/documentRepository.js';
import { createFeedback, listFeedbackByDocument } from '../repositories/feedbackRepository.js';
import { getProfile } from './profileService.js';
import { analyzeStructural } from '../ai-engine/analyzeStructural.js';
import { analyzePersonalized } from '../ai-engine/analyzePersonalized.js';
import { generateEmbedding } from '../ai-engine/embeddingProvider.js';
import { findSimilarExamples } from '../repositories/essayExampleRepository.js';
import { extractTextFromFile, MAX_UPLOAD_BYTES } from './fileExtraction.js';
import { AppError } from '../middleware/errorHandler.js';
import { DEFAULT_ESSAY_TYPE } from '../constants/essayTypes.js';

const BASIC_TIER_DOCUMENT_LIMIT = 1;

// Statement of purpose and essay were never a meaningful distinction in this product, and
// transcripts were never analyzed any differently — there's only one document type now.
const DOCUMENT_TYPE = 'essay';

// `file` is the multer in-memory file object ({ buffer, mimetype, originalname, size }) when
// the request was a multipart upload, or undefined for a pasted-text (JSON) submission —
// exactly one of `rawText` / `file` is expected to carry real content. `essayType` picks
// which rubric to grade against (see constants/essayTypes.js) and defaults to 'general' when
// the caller doesn't send one, preserving the app's original single-rubric behavior.
export async function uploadDocument(user, { rawText, essayType = DEFAULT_ESSAY_TYPE }, file) {
  if (file && file.size > MAX_UPLOAD_BYTES) {
    throw new AppError(413, 'FILE_TOO_LARGE', `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB upload limit.`);
  }

  const resolvedText = file ? await extractTextFromFile(file) : rawText;
  if (!resolvedText || !resolvedText.trim()) {
    throw new AppError(
      400,
      'NO_CONTENT_PROVIDED',
      'Provide essay text or upload a file (.txt, .md, .pdf, or .docx).'
    );
  }

  if (user.tier === 'basic') {
    const existingCount = await countUserDocumentsByType(user.id, DOCUMENT_TYPE);
    if (existingCount >= BASIC_TIER_DOCUMENT_LIMIT) {
      throw new AppError(
        409,
        'DOCUMENT_LIMIT_REACHED',
        `Basic tier allows only ${BASIC_TIER_DOCUMENT_LIMIT} essay upload. Upgrade to Premium for unlimited uploads with version history.`,
        { upgrade: { requiredTier: 'premium', currentTier: 'basic' } }
      );
    }
  }

  const document = await createDocument({
    userId: user.id,
    type: DOCUMENT_TYPE,
    essayType,
    rawText: resolvedText,
    tierAtAnalysis: user.tier,
    originalFilename: file?.originalname ?? null,
  });

  const { analysis: structuralAnalysis, modelVersion: structuralModelVersion } = await analyzeStructural(resolvedText, essayType);
  const structuralFeedback = await createFeedback({
    documentId: document.id,
    stage: 'structural',
    analysisJson: structuralAnalysis,
    modelVersion: structuralModelVersion,
  });

  const feedback = [structuralFeedback];

  if (user.tier === 'premium') {
    const profile = await getProfile(user.id).catch(() => null);

    // RAG: ground Stage 2 feedback in real accepted/rejected essays for the same intended
    // major, retrieved by embedding similarity, rather than the model's unaided judgment.
    let retrievedExamples = [];
    if (profile?.intended_major) {
      const embedding = await generateEmbedding(resolvedText);
      retrievedExamples = await findSimilarExamples(embedding, profile.intended_major);
    }

    const { analysis: personalizedAnalysis, modelVersion: personalizedModelVersion } = await analyzePersonalized(
      resolvedText,
      profile ?? {},
      structuralAnalysis,
      retrievedExamples
    );
    feedback.push(
      await createFeedback({
        documentId: document.id,
        stage: 'personalized',
        analysisJson: personalizedAnalysis,
        modelVersion: personalizedModelVersion,
      })
    );
  }

  return { document, feedback };
}

export async function listDocuments(userId) {
  return listDocumentsByUser(userId);
}

export async function getFeedbackForDocument(userId, documentId) {
  const document = await findDocumentById(documentId);
  if (!document || document.user_id !== userId) {
    throw new AppError(403, 'NOT_YOUR_DOCUMENT', 'This document does not belong to your account.');
  }
  return listFeedbackByDocument(documentId);
}
