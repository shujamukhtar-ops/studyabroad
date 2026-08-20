export function MatchCard({ match }) {
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
    </article>
  );
}
