import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { COUNTRIES } from '../constants/profileOptions.js';

const COUNTRY_LABEL_BY_VALUE = Object.fromEntries(COUNTRIES.map((c) => [c.value, c.label]));

// Mirrors profiles.degree_level's own vocabulary (see backend/src/constants — degreeLevel is
// validated against exactly these three values), not a separate list of its own.
const DEGREE_LEVEL_LABEL = { undergraduate: "Bachelor's", graduate: "Master's", phd: 'PhD' };

// scholarships.deadline comes back as a plain 'YYYY-MM-DD' string (see backend/src/
// repositories/db.js's DATE type-parser fix). Parsing it through the local-time Date(y, m, d)
// constructor rather than `new Date(dateString)` avoids the classic off-by-one-day bug: an
// ISO date-only string parses as UTC midnight, which toLocaleDateString() would then render
// as the *previous* day in any timezone west of UTC.
function formatDeadline(dateStr) {
  if (!dateStr) return 'Rolling — no fixed deadline';
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatAmount(scholarship) {
  if (scholarship.amount_text) return scholarship.amount_text;
  if (scholarship.amount != null) return `$${Number(scholarship.amount).toLocaleString()}`;
  return 'Varies';
}

function ScholarshipCard({ scholarship }) {
  return (
    <article className="data-card">
      <div className="data-card-head">
        <h4>{scholarship.name}</h4>
        {scholarship.destination_countries?.length > 0 && (
          <span className="tag">{scholarship.destination_countries.map((c) => COUNTRY_LABEL_BY_VALUE[c] ?? c).join(', ')}</span>
        )}
        {scholarship.degree_levels?.length > 0 && (
          <span className="tag">{scholarship.degree_levels.map((d) => DEGREE_LEVEL_LABEL[d] ?? d).join(', ')}</span>
        )}
      </div>
      <div className="stat-row">
        <span>Award <span className="stat-value">{formatAmount(scholarship)}</span></span>
        <span>Deadline <span className="stat-value">{formatDeadline(scholarship.deadline)}</span></span>
      </div>
      {scholarship.eligibility_note && <p className="meta-line">Eligibility: {scholarship.eligibility_note}</p>}
      {scholarship.source_url ? (
        <a href={scholarship.source_url} target="_blank" rel="noreferrer noopener" className="link-button">
          Official page ↗
        </a>
      ) : (
        // No verified official URL for this scholarship (mostly the scraped_archive import —
        // see DATA_SOURCES.md, the raw dataset's own url field is 'N/A' for every row). Rather
        // than guess a page and risk sending a user to the wrong or expired one, link to a
        // live search for the exact title so they can find and verify the current source
        // themselves — this doesn't assert any specific page as the official one.
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(`"${scholarship.name}" scholarship`)}`}
          target="_blank"
          rel="noreferrer noopener"
          className="link-button"
        >
          Search for this scholarship ↗
        </a>
      )}
    </article>
  );
}

export function ScholarshipsPage() {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    api
      .getScholarships()
      .then((data) => setState({ status: 'ready', data }))
      .catch(() => setState({ status: 'error', data: null }));
  }, []);

  if (state.status === 'loading') return <p>Loading scholarships…</p>;
  if (state.status === 'error') return <p className="error">Couldn't load scholarships. Try again shortly.</p>;

  return (
    <div>
      <div className="page-head">
        <span className="label accent">Funding</span>
        <h2>Scholarships</h2>
      </div>

      {state.data.scholarships.length === 0 && (
        <p>No scholarships match your profile yet — set your target countries on your Profile page to see relevant funding.</p>
      )}
      <div className="card-grid">
        {state.data.scholarships.map((s) => <ScholarshipCard key={s.id} scholarship={s} />)}
      </div>
    </div>
  );
}
