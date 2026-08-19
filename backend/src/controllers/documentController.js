import * as documentService from '../services/documentService.js';

export async function uploadDocument(req, res, next) {
  try {
    const { document, feedback } = await documentService.uploadDocument(req.user, req.body, req.file);
    res.status(201).json({ document, feedback });
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(req, res, next) {
  try {
    const documents = await documentService.listDocuments(req.user.id);
    res.status(200).json({ documents });
  } catch (err) {
    next(err);
  }
}

export async function getFeedback(req, res, next) {
  try {
    const feedback = await documentService.getFeedbackForDocument(req.user.id, req.params.documentId);
    res.status(200).json({ feedback });
  } catch (err) {
    next(err);
  }
}
