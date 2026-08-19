import { useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../containers/AuthContext.jsx';

// Progress is stored per destination so it survives re-fetching the same
// checklist (e.g. navigating away and back) without needing a backend model
// for it — this is a local application-progress tracker, not sourced data.
function progressKey(destination) {
  return `visa-checklist-progress:${destination.trim().toLowerCase()}`;
}

function loadProgress(destination) {
  try {
    const raw = localStorage.getItem(progressKey(destination));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveProgress(destination, checkedSet) {
  localStorage.setItem(progressKey(destination), JSON.stringify([...checkedSet]));
}

export function VisaPage() {
  const { tier } = useAuth();
  const [destination, setDestination] = useState('');
  const [result, setResult] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const data = await api.getVisaChecklist(destination);
      setResult(data);
      setChecked(loadProgress(destination));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VISA_DATA_UNAVAILABLE') {
        setError(`No reviewed checklist is available yet for this destination. ${err.message}`);
      } else {
        setError(err.message);
      }
    }
  }

  function toggleItem(index) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      saveProgress(destination, next);
      return next;
    });
  }

  return (
    <div>
      <div className="page-head">
        <span className="label accent">Entry requirements</span>
        <h2>Visa checklist</h2>
      </div>
      {tier === 'basic' && <p className="hint">Basic tier shows a generic checklist. Premium shows the destination's actual requirements, sourced from its official immigration site.</p>}

      <form onSubmit={handleSubmit} className="panel" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '1rem', maxWidth: 480 }}>
        <label style={{ flex: 1 }}>
          <span>Destination country</span>
          <input type="text" required value={destination} onChange={(e) => setDestination(e.target.value)} />
        </label>
        <button type="submit" className="btn accent">Get checklist</button>
      </form>

      {error && <p className="error" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}

      {result && (
        <>
          <hr className="rule" />
          <div className="data-card">
            <div className="data-card-head">
              <h4>{result.destination}</h4>
              <span className="tag">{result.curated ? 'Verified' : 'Generic'}</span>
            </div>
            <p className="meta-line" style={{ marginTop: 0 }}>
              {checked.size} of {result.checklist.length} completed
            </p>
            <ul className="checklist">
              {result.checklist.map((item, i) => {
                const isChecked = checked.has(i);
                return (
                  <li key={i} className={isChecked ? 'is-checked' : ''}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-label={isChecked ? `Mark "${item}" as not completed` : `Mark "${item}" as completed`}
                      className="marker"
                      onClick={() => toggleItem(i)}
                    >
                      {isChecked && (
                        <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
                          <path d="M2 8.5 6 12l8-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <button type="button" className="checklist-label" onClick={() => toggleItem(i)}>
                      {item}
                    </button>
                  </li>
                );
              })}
            </ul>
            {result.sourceUrl && <p className="meta-line"><a href={result.sourceUrl} target="_blank" rel="noreferrer">Source</a></p>}
          </div>
        </>
      )}
    </div>
  );
}
