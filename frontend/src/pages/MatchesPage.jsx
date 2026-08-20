import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { MatchCard } from '../components/MatchCard.jsx';

export function MatchesPage() {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    api
      .getMatches()
      .then((data) => setState({ status: 'ready', data }))
      .catch(() => setState({ status: 'error', data: null }));
  }, []);

  if (state.status === 'loading') return <p>Loading matches…</p>;
  if (state.status === 'error') return <p className="error">Couldn't load matches. Try again shortly.</p>;

  return (
    <div>
      <div className="page-head">
        <span className="label accent">Recommendations</span>
        <h2>School matches</h2>
      </div>

      {/* Subtle, non-blocking upsell — matches themselves are never withheld on the free
          tier (see matchingService.js); this just explains why Premium's matches are
          sharper, right where the difference would actually show up. */}
      {state.data.upgradeNote && <p className="hint">{state.data.upgradeNote}</p>}

      {state.data.schools.length === 0 && <p>No matches yet — fill in your profile to get school recommendations.</p>}
      <div className="card-grid">
        {state.data.schools.map((m) => <MatchCard key={m.id} match={m} />)}
      </div>
    </div>
  );
}
