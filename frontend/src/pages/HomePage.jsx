import { Link } from 'react-router-dom';
import { useAuth } from '../containers/AuthContext.jsx';

export function HomePage() {
  const { isAuthenticated } = useAuth();
  return (
    <div>
      <section className="hero">
        <div>
          <span className="label accent">For international applicants</span>
          <h1>Plan your study abroad application on verified data.</h1>
          <p className="lede">
            Profile-based essay feedback, school and scholarship matching, and destination-specific
            visa guidance — grounded in government and curated sources, not generated guesses.
          </p>
          {!isAuthenticated && (
            <Link to="/register">
              <button type="button" className="btn accent">
                Get started <span className="arrow" aria-hidden="true">→</span>
              </button>
            </Link>
          )}
        </div>
        <div className="hero-figure">
          <span className="label">What's behind the matches</span>
          <div className="figure-row"><span>US schools (College Scorecard)</span><span>100+</span></div>
          <div className="figure-row"><span>Curated schools (UK / CA / AU / EU)</span><span>12</span></div>
          <div className="figure-row"><span>Scholarships tracked</span><span>10</span></div>
          <div className="figure-row"><span>AI role</span><span>Ranks, never invents</span></div>
        </div>
      </section>

      <hr className="rule" />

      <div className="feature-grid">
        <div className="feature">
          <h3>Essay review</h3>
          <p>Structural feedback for everyone; profile-personalized rewrite guidance on Premium.</p>
        </div>
        <div className="feature">
          <h3>School matching</h3>
          <p>Ranked against your budget, major, and target countries — from verified school data.</p>
        </div>
        <div className="feature">
          <h3>Visa checklists</h3>
          <p>Curated, reviewed checklists by country pair — never AI-guessed immigration advice.</p>
        </div>
      </div>
    </div>
  );
}
