import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { AppError } from '../middleware/errorHandler.js';

const SUPPORTED_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

function extensionOf(filename) {
  const match = /\.([a-z0-9]+)$/i.exec(filename ?? '');
  return match ? match[1].toLowerCase() : '';
}

// Some browsers send text/plain for .md files, or an empty/generic mimetype for drag-dropped
// files — fall back to the extension so a correctly-named file isn't rejected on a mimetype
// quirk outside the user's control.
function resolveFormat(mimetype, filename) {
  const ext = extensionOf(filename);
  if (mimetype === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') return 'docx';
  if (mimetype === 'text/plain' || mimetype === 'text/markdown' || ext === 'txt' || ext === 'md') return 'text';
  return null;
}

export async function extractTextFromFile({ buffer, mimetype, originalname }) {
  const format = resolveFormat(mimetype, originalname);
  if (!format) {
    throw new AppError(
      415,
      'UNSUPPORTED_FILE_TYPE',
      `"${originalname}" isn't a supported file type. Upload a .txt, .md, .pdf, or .docx file, or paste your text instead.`
    );
  }

  if (format === 'text') return buffer.toString('utf8');

  if (format === 'pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const { text } = await parser.getText();
      return text;
    } finally {
      await parser.destroy();
    }
  }

  // format === 'docx'
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

export function isSupportedUploadMimeType(mimetype) {
  return SUPPORTED_MIME_TYPES.has(mimetype);
}
