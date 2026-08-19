import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../containers/AuthContext.jsx';

function NavLink({ to, children }) {
  const { pathname } = useLocation();
  return (
    <Link to={to} className={pathname === to ? 'active' : undefined}>
      {children}
    </Link>
  );
}

export function Navbar() {
  const { isAuthenticated, tier, logout } = useAuth();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="wordmark">
          StudyAbroad<span className="dot">.</span>
        </Link>
        {isAuthenticated ? (
          <nav className="site-nav">
            <NavLink to="/profile">Profile</NavLink>
            <NavLink to="/documents">Essays</NavLink>
            <NavLink to="/matches">Matches</NavLink>
            <NavLink to="/visa">Visa</NavLink>
            <span className={`tier-pill ${tier === 'premium' ? 'premium' : ''}`}>{tier}</span>
            <button type="button" className="link-button" onClick={logout}>Log out</button>
          </nav>
        ) : (
          <nav className="site-nav">
            <NavLink to="/login">Log in</NavLink>
            <Link to="/register"><button type="button" className="btn accent">Register</button></Link>
          </nav>
        )}
      </div>
    </header>
  );
}
