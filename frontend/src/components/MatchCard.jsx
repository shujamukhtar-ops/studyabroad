function formatUsd(value) {
  return `$${Number(value).toLocaleString()}`;
}

// No verified official URL for this school (a school with no college_scorecard-sourced row —
// see DATA_SOURCES.md — mainly QS-only non-US schools). Rather than guess a domain and risk
// sending a student to the wrong or dead page, link to a live search, same fallback pattern
// already used for scholarships with no source_url (see ScholarshipsPage.jsx).
function searchFallbackUrl(schoolName, query) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${schoolName} ${query}`)}`;
}

// A pre-filled, editable draft opened in the student's own email client — this app has no
// email-sending infrastructure, and a fee waiver request is expected to come from the actual
// applicant's own address, not a third party on their behalf. Recipient is left blank (schools
// don't publish one universal financial-aid email this app can verify per institution — see the
// "Visit financial aid office" link instead) so the student fills it in after finding it
// themselves; [Your Name] / [briefly explain...] are placeholders for the student to replace,
// not data this app has (there's no student "full name" field in this app's profile).
function feeWaiverMailtoUrl(schoolName) {
  const subject = `Fee Waiver Request – ${schoolName}`;
  const body = `To the Admissions/Financial Aid Office,

I am an international applicant to ${schoolName} and I am writing to request a waiver of the application fee due to financial hardship.

[Briefly explain your financial circumstances here — e.g. inability to pay the fee, reliance on need-based aid, or a fee-waiver program you qualify for.]

Please let me know if you require any supporting documentation. Thank you for your time and consideration.

Sincerely,
[Your Name]`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function MatchCard({ match }) {
  const hasCostInfo = match.school_avg_tuition != null || match.school_net_price_after_aid != null;

  return (
    <article className="data-card">
      <div className="data-card-head">
        <h4>{match.school_name}</h4>
        <span className="tag">{match.school_country}</span>
      </div>
      {match.school_world_rank != null && (
        <p className="meta-line">QS World Rank <strong>#{match.school_world_rank}</strong></p>
      )}
      <div className="stat-row">
        {match.fit_category && (
          <span className={`fit-badge ${match.fit_category.toLowerCase()}`}>{match.fit_category}</span>
        )}
        <span>Fit score <span className="stat-value">{Number(match.score).toFixed(2)}</span></span>
      </div>
      <p>{match.reasoning_text}</p>

      {hasCostInfo && (
        <div className="stat-row">
          {match.school_avg_tuition != null && (
            <span>Sticker tuition <span className="stat-value">{formatUsd(match.school_avg_tuition)}</span></span>
          )}
          {match.school_net_price_after_aid != null && (
            <span>
              Avg. cost after aid <span className="stat-value">{formatUsd(match.school_net_price_after_aid)}</span>
              {match.school_pct_receiving_aid != null && ` (${Math.round(match.school_pct_receiving_aid)}% of students receive aid)`}
            </span>
          )}
        </div>
      )}

      <div className="stat-row">
        <a
          href={match.school_website_url ?? searchFallbackUrl(match.school_name, 'admissions')}
          target="_blank"
          rel="noreferrer noopener"
          className="link-button"
        >
          {match.school_website_url ? 'Visit website & apply ↗' : 'Search for admissions page ↗'}
        </a>
        {match.school_net_price_calculator_url ? (
          <a href={match.school_net_price_calculator_url} target="_blank" rel="noreferrer noopener" className="link-button">
            Estimate your cost ↗
          </a>
        ) : (
          <a
            href={searchFallbackUrl(match.school_name, 'net price calculator')}
            target="_blank"
            rel="noreferrer noopener"
            className="link-button"
          >
            Search for net price calculator ↗
          </a>
        )}
        <a href={feeWaiverMailtoUrl(match.school_name)} className="link-button">
          Draft fee waiver request email ↗
        </a>
      </div>
    </article>
  );
}
