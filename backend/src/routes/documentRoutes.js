import { Router } from 'express';
import multer from 'multer';
import * as documentController from '../controllers/documentController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { documentUploadSchema } from './schemas.js';
import { MAX_UPLOAD_BYTES } from '../services/fileExtraction.js';
import { AppError } from '../middleware/errorHandler.js';

export const documentRoutes = Router();

// Memory storage, not disk — files are parsed to text immediately in documentService and
// never need to persist as files themselves (see fileExtraction.js), so there's no reason
// to write them to disk first. `upload.single('file')` leaves req.body's other multipart
// text fields (type, rawText) populated normally for the zod validation step after it.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'FILE_TOO_LARGE', `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB upload limit.`));
    }
    if (err) return next(err);
    next();
  });
}

documentRoutes.post('/', requireAuth, handleUpload, validate(documentUploadSchema), documentController.uploadDocument);
documentRoutes.get('/', requireAuth, documentController.listDocuments);
