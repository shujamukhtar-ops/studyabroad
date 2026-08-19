export function MatchCard({ match }) {
  return (
    <article className="data-card">
      <div className="data-card-head">
        <h4>{match.school_name}</h4>
        <span className="tag">{match.school_country}</span>
      </div>
      <div className="stat-row">
        <span>Fit score <span className="stat-value">{Number(match.score).toFixed(2)}</span></span>
      </div>
      <p>{match.reasoning_text}</p>
    </article>
  );
}
