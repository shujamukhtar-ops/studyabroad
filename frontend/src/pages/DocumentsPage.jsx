import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { FeedbackCard } from '../components/FeedbackCard.jsx';
import { UpgradePrompt } from '../components/UpgradePrompt.jsx';
import { useAuth } from '../containers/AuthContext.jsx';
import { COMMON_APP_PROMPTS } from '../constants/commonAppPrompts.js';
import { COUNTRY_ESSAY_GUIDANCE } from '../constants/essayCountryGuidance.js';

const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx'];
const MAX_UPLOAD_MB = 5;

// Must stay in sync with backend/src/constants/essayTypes.js ESSAY_TYPES — the fixed
// rubric vocabulary ai-engine/sopRubric.js's ESSAY_RUBRICS is keyed by. The backend still
// supports 'general' (its original single rubric, used as the fallback when a caller omits
// essayType entirely) but it's deliberately left out of this list — now that every real
// application type has its own named rubric, offering a vague catch-all alongside them
// isn't a useful choice for a student to make.
const ESSAY_TYPE_OPTIONS = [
  { value: 'undergraduate', label: 'US undergraduate (Common App narrative essay)' },
  { value: 'graduate', label: "Graduate / Master's statement of purpose" },
  { value: 'phd', label: 'PhD statement of purpose' },
  { value: 'uk_undergraduate', label: 'UK undergraduate (UCAS personal statement)' },
  { value: 'motivation_letter', label: 'Motivation letter (Netherlands, Germany, Switzerland, EU programs)' },
  { value: 'scholarship', label: 'Scholarship application essay' },
  { value: 'fellowship', label: 'Fellowship application essay' },
];

export function DocumentsPage() {
  const { tier } = useAuth();
  const [mode, setMode] = useState('paste'); // 'paste' | 'file'
  const [essayType, setEssayType] = useState('graduate');
  const [commonAppPromptId, setCommonAppPromptId] = useState('');
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [limitError, setLimitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [targetCountries, setTargetCountries] = useState([]);

  useEffect(() => {
    // Best-effort — a student may not have filled in their profile yet, and this hint is a
    // convenience, not a requirement for the upload flow below to work.
    api.getProfile().then((data) => setTargetCountries(data.profile?.target_countries ?? [])).catch(() => {});
  }, []);

  // The Common App essay is a US-specific system, not a universal default — this only ever
  // nudges (see the hint rendered below), it never blocks a submission, since a student may
  // legitimately be drafting for a country other than what's currently saved on their profile.
  const countryGuidance = useMemo(() => {
    const matches = targetCountries.map((c) => COUNTRY_ESSAY_GUIDANCE[c]).filter(Boolean);
    if (matches.length === 0) return null;
    return matches.find((g) => g.essayType !== essayType) ?? null;
  }, [targetCountries, essayType]);

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
      const promptId = essayType === 'undergraduate' && commonAppPromptId ? Number(commonAppPromptId) : undefined;
      const payload = mode === 'file'
        ? { file, essayType, commonAppPromptId: promptId }
        : { rawText, essayType, commonAppPromptId: promptId };
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
          <select value={essayType} onChange={(e) => { setEssayType(e.target.value); setCommonAppPromptId(''); }}>
            {ESSAY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        {countryGuidance && (
          <p className="hint">
            Based on your profile's target countries: {countryGuidance.note}
          </p>
        )}

        {essayType === 'undergraduate' && (
          <label>
            <span>Which Common App prompt are you responding to? (optional)</span>
            <select value={commonAppPromptId} onChange={(e) => setCommonAppPromptId(e.target.value)}>
              <option value="">Not sure / don't specify</option>
              {COMMON_APP_PROMPTS.map((p) => (
                <option key={p.id} value={p.id}>{`Prompt ${p.id}: ${p.text.slice(0, 80)}${p.text.length > 80 ? '…' : ''}`}</option>
              ))}
            </select>
          </label>
        )}

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
