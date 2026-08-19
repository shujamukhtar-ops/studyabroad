const BAND_CLASS = {
  'Needs significant work': 'band-weak',
  Developing: 'band-developing',
  Strong: 'band-strong',
  Excellent: 'band-strong',
};

function ScoreBadge({ score, label }) {
  const bandClass = BAND_CLASS[label] ?? 'band-developing';
  return (
    <div className={`score-badge ${bandClass}`}>
      <span className="score-number">{score}</span>
      <span className="score-max">/100</span>
      <span className="score-label">{label}</span>
    </div>
  );
}

function DimensionScores({ scores }) {
  return (
    <ul className="score-row">
      {Object.entries(scores ?? {}).map(([key, value]) => (
        <li key={key}>{key.replace(/_/g, ' ')} <b>{value.toFixed(1)}/10</b></li>
      ))}
    </ul>
  );
}

export function FeedbackCard({ feedback }) {
  const { stage, analysis_json: analysis } = feedback;

  return (
    <article className="data-card">
      <div className="data-card-head">
        <h4>{stage === 'structural' ? 'Structural & content feedback' : 'Personalized feedback'}</h4>
        <span className="tag">{stage.toUpperCase()}</span>
      </div>

      {stage === 'structural' ? (
        <>
          {analysis.rubric_label && <p className="meta-line" style={{ marginTop: 0 }}>Graded against: {analysis.rubric_label}</p>}
          {typeof analysis.overall_score === 'number' && (
            <ScoreBadge score={analysis.overall_score} label={analysis.score_label} />
          )}
          <DimensionScores scores={analysis.scores} />
          <p>{analysis.overall_summary}</p>
          {typeof analysis.word_count === 'number' && (
            <p className="meta-line" style={{ marginTop: 0 }}>{analysis.word_count} words</p>
          )}

          {(analysis.strengths ?? []).length > 0 && (
            <>
              <p className="label accent" style={{ marginTop: 'var(--space-3)' }}>What's working</p>
              <ul className="checklist">
                {analysis.strengths.map((s, i) => (
                  <li key={i}><span className="marker is-static" aria-hidden="true" /><span>{s}</span></li>
                ))}
              </ul>
            </>
          )}

          {(analysis.comments ?? []).length > 0 && (
            <>
              <p className="label" style={{ marginTop: 'var(--space-3)' }}>To improve</p>
              <ul className="checklist">
                {analysis.comments.map((comment, i) => (
                  <li key={i}>
                    <span className={`marker is-static severity-${comment.severity ?? 'medium'}`} aria-hidden="true" />
                    <span><strong>{(comment.dimension ?? comment.span ?? '').replace(/_/g, ' ')}:</strong> {comment.issue}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <>
          {typeof analysis.fit_score === 'number' && (
            <p className="meta-line" style={{ marginTop: 0 }}>
              Major fit signal: <b>{analysis.fit_score.toFixed(1)}/10</b>
            </p>
          )}
          <p>{analysis.target_school_alignment_notes}</p>
          <ul className="checklist">
            {(analysis.rewrite_suggestions ?? []).map((s, i) => (
              <li key={i}>
                <span className={`marker is-static severity-${s.severity ?? 'medium'}`} aria-hidden="true" />
                <span>
                  {s.dimension && <strong>{s.dimension.replace(/_/g, ' ')}: </strong>}
                  {s.original && <><em>&ldquo;{s.original}&rdquo;</em> — </>}
                  {s.suggestion}
                  {s.rationale && <span className="meta-line" style={{ display: 'block', marginTop: '0.2rem' }}>{s.rationale}</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
