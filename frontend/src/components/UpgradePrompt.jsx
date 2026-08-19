// Purely presentational: renders the upsell state a premium-gated feature shows a basic
// user, instead of hiding the feature or showing a bare error. Driven by the ApiError's
// `upgrade` field, which the backend's checkTier middleware always includes on a 403.
export function UpgradePrompt({ message, requiredTier = 'premium' }) {
  return (
    <div className="upsell" role="alert">
      <div className="upsell-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="5" y="11" width="14" height="9" rx="1.5" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </div>
      <div>
        <span className="label">Premium feature</span>
        <p>{message ?? 'This feature requires a Premium subscription.'}</p>
        <button type="button" className="btn accent" disabled title="Billing not wired up yet — see RISK_NOTES.md">
          Upgrade to {requiredTier}
        </button>
      </div>
    </div>
  );
}
