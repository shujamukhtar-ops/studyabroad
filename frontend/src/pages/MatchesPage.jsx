import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { MatchCard } from '../components/MatchCard.jsx';
import { UpgradePrompt } from '../components/UpgradePrompt.jsx';

export function MatchesPage() {
  const [state, setState] = useState({ status: 'loading', data: null, upgradeError: null });

  useEffect(() => {
    api
      .getMatches()
      .then((data) => setState({ status: 'ready', data, upgradeError: null }))
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'TIER_UPGRADE_REQUIRED') {
          setState({ status: 'upgrade-required', data: null, upgradeError: err });
        } else {
          setState({ status: 'error', data: null, upgradeError: null });
        }
      });
  }, []);

  if (state.status === 'loading') return <p>Loading matches…</p>;
  if (state.status === 'error') return <p className="error">Couldn't load matches. Try again shortly.</p>;

  return (
    <div>
      <div className="page-head">
        <span className="label accent">Recommendations</span>
        <h2>School matches</h2>
      </div>

      {state.status === 'upgrade-required' ? (
        <UpgradePrompt message={state.upgradeError.message} requiredTier={state.upgradeError.upgrade?.requiredTier} />
      ) : (
        <>
          {state.data.schools.length === 0 && <p>No matches yet — fill in your profile to get school recommendations.</p>}
          <div className="card-grid">
            {state.data.schools.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>

          <hr className="rule" />
          <h3>Scholarships</h3>
          <div className="card-grid">
          {state.data.scholarships.map((s) => (
            <article className="data-card" key={s.id}>
              <div className="data-card-head">
                <h4>{s.name}</h4>
              </div>
              <div className="stat-row">
                <span>Amount <span className="stat-value">{s.amount ?? 'varies'}</span></span>
                <span>Deadline <span className="stat-value">{s.deadline ?? 'n/a'}</span></span>
              </div>
            </article>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
