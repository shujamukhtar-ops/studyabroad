import { useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { FeedbackCard } from '../components/FeedbackCard.jsx';
import { UpgradePrompt } from '../components/UpgradePrompt.jsx';
import { useAuth } from '../containers/AuthContext.jsx';

const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx'];
const MAX_UPLOAD_MB = 5;

// Must stay in sync with backend/src/constants/essayTypes.js ESSAY_TYPES — the fixed
// rubric vocabulary ai-engine/sopRubric.js's ESSAY_RUBRICS is keyed by. The backend still
// supports 'general' (its original single rubric, used as the fallback when a caller omits
// essayType entirely) but it's deliberately left out of this list — now that every real
// application type has its own named rubric, offering a vague catch-all alongside them
// isn't a useful choice for a student to make.
const ESSAY_TYPE_OPTIONS = [
  { value: 'undergraduate', label: 'Undergraduate (Common App narrative essay)' },
  { value: 'graduate', label: "Graduate / Master's statement of purpose" },
  { value: 'phd', label: 'PhD statement of purpose' },
  { value: 'uk_undergraduate', label: 'UK undergraduate (UCAS personal statement)' },
  { value: 'scholarship', label: 'Scholarship application essay' },
  { value: 'fellowship', label: 'Fellowship application essay' },
];

export function DocumentsPage() {
  const { tier } = useAuth();
  const [mode, setMode] = useState('paste'); // 'paste' | 'file'
  const [essayType, setEssayType] = useState('graduate');
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [limitError, setLimitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(e) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLimitError(null);
    setSubmitting(true);
    try {
      const payload = mode === 'file' ? { file, essayType } : { rawText, essayType };
      const { feedback: newFeedback } = await api.uploadDocument(payload);
      setFeedback(newFeedback);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DOCUMENT_LIMIT_REACHED') {
        setLimitError(err);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <span className="label accent">Document intake</span>
        <h2>Essay / SOP review</h2>
      </div>
      {tier === 'basic' && (
        <p className="hint">Basic tier: one essay upload, structural feedback and score only. Premium adds unlimited uploads and profile-personalized feedback.</p>
      )}
      <form onSubmit={handleSubmit} className="panel" style={{ maxWidth: '100%' }}>
        <label>
          <span>Application type</span>
          <select value={essayType} onChange={(e) => setEssayType(e.target.value)}>
            {ESSAY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <div className="tab-row" role="tablist" aria-label="How to provide your text">
          <button type="button" role="tab" aria-selected={mode === 'paste'} className={`tab ${mode === 'paste' ? 'active' : ''}`} onClick={() => setMode('paste')}>
            Paste text
          </button>
          <button type="button" role="tab" aria-selected={mode === 'file'} className={`tab ${mode === 'file' ? 'active' : ''}`} onClick={() => setMode('file')}>
            Upload file
          </button>
        </div>

        {mode === 'paste' ? (
          <label>
            <span>Essay text</span>
            <textarea rows={9} value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Paste your essay or statement of purpose…" required={mode === 'paste'} />
          </label>
        ) : (
          <label>
            <span>File</span>
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              onChange={handleFileChange}
              required={mode === 'file'}
            />
            <span className="hint" style={{ marginBottom: 0 }}>
              Accepted: {ACCEPTED_EXTENSIONS.join(', ')} — max {MAX_UPLOAD_MB}MB.
              {file && ` Selected: ${file.name} (${(file.size / 1024).toFixed(0)}KB).`}
            </span>
          </label>
        )}

        <button type="submit" className="btn accent" disabled={submitting}>{submitting ? 'Analyzing…' : 'Submit for review'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {limitError && (
        <>
          <hr className="rule" />
          <UpgradePrompt message={limitError.message} requiredTier={limitError.upgrade?.requiredTier} />
        </>
      )}
      {feedback && (
        <>
          <hr className="rule" />
          {feedback.map((f) => <FeedbackCard key={f.id ?? f.stage} feedback={f} />)}
        </>
      )}
    </div>
  );
}
