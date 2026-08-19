import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/documentRepository.js', () => ({
  countUserDocumentsByType: vi.fn(),
  createDocument: vi.fn(),
  findDocumentById: vi.fn(),
  listDocumentsByUser: vi.fn(),
}));
vi.mock('../../src/repositories/feedbackRepository.js', () => ({
  createFeedback: vi.fn(),
  listFeedbackByDocument: vi.fn(),
}));
vi.mock('../../src/repositories/essayExampleRepository.js', () => ({
  findSimilarExamples: vi.fn(),
}));
vi.mock('../../src/services/profileService.js', () => ({
  getProfile: vi.fn(),
}));

const { countUserDocumentsByType, createDocument } = await import('../../src/repositories/documentRepository.js');
const { createFeedback } = await import('../../src/repositories/feedbackRepository.js');
const { findSimilarExamples } = await import('../../src/repositories/essayExampleRepository.js');
const { getProfile } = await import('../../src/services/profileService.js');
const { createApp } = await import('../../src/app.js');
const { signToken } = await import('../../src/middleware/auth.js');

const app = createApp();

function tokenFor(tier) {
  return signToken({ id: 'user-1', tier });
}

beforeEach(() => {
  vi.clearAllMocks();
  countUserDocumentsByType.mockResolvedValue(0);
  createDocument.mockImplementation(async ({ userId, type, rawText, tierAtAnalysis }) => ({
    id: 'doc-1',
    user_id: userId,
    type,
    raw_text: rawText,
    tier_at_analysis: tierAtAnalysis,
    uploaded_at: new Date().toISOString(),
  }));
  createFeedback.mockImplementation(async ({ stage, analysisJson, modelVersion }) => ({
    id: `fb-${stage}`,
    stage,
    analysis_json: analysisJson,
    model_version: modelVersion,
  }));
  getProfile.mockResolvedValue({ target_countries: ['US'], intended_major: 'computer_science', budget_range: '30-50k' });
  findSimilarExamples.mockResolvedValue([]);
});

describe('POST /api/documents (integration, mock AIProvider)', () => {
  it('basic tier gets structural-only feedback, never personalized', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .send({ rawText: 'I have always wanted to study computer science.' });

    expect(res.status).toBe(201);
    const stages = res.body.feedback.map((f) => f.stage);
    expect(stages).toEqual(['structural']);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('premium tier gets both structural and personalized feedback', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('premium')}`)
      .send({ rawText: 'I have always wanted to study computer science.' });

    expect(res.status).toBe(201);
    const stages = res.body.feedback.map((f) => f.stage);
    expect(stages).toEqual(['structural', 'personalized']);
  });

  it('retrieves baseline examples for the profile intended_major before running Stage 2 (RAG)', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('premium')}`)
      .send({ rawText: 'I have always wanted to study computer science.' });

    expect(res.status).toBe(201);
    expect(findSimilarExamples).toHaveBeenCalledTimes(1);
    const [embedding, major] = findSimilarExamples.mock.calls[0];
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding).toHaveLength(1024);
    expect(major).toBe('computer_science');
  });

  it('skips example retrieval entirely when the profile has no intended_major', async () => {
    getProfile.mockResolvedValue({ target_countries: ['US'] });

    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('premium')}`)
      .send({ rawText: 'I have always wanted to study computer science.' });

    expect(res.status).toBe(201);
    expect(findSimilarExamples).not.toHaveBeenCalled();
  });

  it('grades against the requested rubric when essayType is provided', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .send({ rawText: 'I have always been fascinated by structures and machines.', essayType: 'phd' });

    expect(res.status).toBe(201);
    const structural = res.body.feedback.find((f) => f.stage === 'structural');
    expect(structural.analysis_json.essay_type).toBe('phd');
    expect(structural.analysis_json.scores).toHaveProperty('faculty_alignment_program_ecosystem');
    expect(createDocument).toHaveBeenCalledWith(expect.objectContaining({ essayType: 'phd' }));
  });

  it('defaults to the general rubric when essayType is omitted', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .send({ rawText: 'I have always been fascinated by structures and machines.' });

    expect(res.status).toBe(201);
    const structural = res.body.feedback.find((f) => f.stage === 'structural');
    expect(structural.analysis_json.essay_type).toBe('general');
    expect(createDocument).toHaveBeenCalledWith(expect.objectContaining({ essayType: 'general' }));
  });

  it('rejects an unrecognized essayType with 400 before touching the document repository', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .send({ rawText: 'Some essay text.', essayType: 'not_a_real_type' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('rejects a basic-tier user uploading a second essay, even though the endpoint has no tier middleware — the limit is enforced in the service layer', async () => {
    countUserDocumentsByType.mockResolvedValue(1);

    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .send({ rawText: 'Second essay.' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DOCUMENT_LIMIT_REACHED');
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('rejects malformed input (rawText not a string) with 400 before touching the document repository', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .send({ rawText: 12345 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('always records the document as type "essay" regardless of upload mode', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .send({ rawText: 'Some essay text.' });

    expect(res.status).toBe(201);
    expect(createDocument).toHaveBeenCalledWith(expect.objectContaining({ type: 'essay' }));
  });

  it('accepts a plain-text file upload, extracts its content, and records the original filename', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .attach('file', Buffer.from('My essay content from a file.'), { filename: 'essay.txt', contentType: 'text/plain' });

    expect(res.status).toBe(201);
    expect(createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ rawText: 'My essay content from a file.', originalFilename: 'essay.txt' })
    );
  });

  it('rejects a file type it cannot extract text from', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .attach('file', Buffer.from('fake image bytes'), { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('rejects a request with neither rawText nor a file', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_CONTENT_PROVIDED');
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('rejects a file over the size limit', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor('basic')}`)
      .attach('file', Buffer.alloc(6 * 1024 * 1024, 'a'), { filename: 'huge.txt', contentType: 'text/plain' });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    expect(createDocument).not.toHaveBeenCalled();
  });
});
