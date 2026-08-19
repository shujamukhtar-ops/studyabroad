import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';

const BUDGET_OPTIONS = ['<15k', '15-30k', '30-50k', '50k+'];

// Must stay in sync with backend/src/constants/majors.js — this is the fixed vocabulary
// school/scholarship major_tags are matched against. A freeform major here would silently
// never match anything, since matching is an exact tag comparison, not a text search.
const MAJOR_OPTIONS = [
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'business', label: 'Business' },
  { value: 'economics', label: 'Economics' },
  { value: 'law', label: 'Law' },
];

export function ProfilePage() {
  const [form, setForm] = useState({ targetCountries: '', intendedMajor: '', targetIntake: '', budgetRange: '', gpa: '' });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getProfile()
      .then((data) => {
        const p = data.profile;
        setForm({
          targetCountries: (p.target_countries ?? []).join(', '),
          intendedMajor: p.intended_major ?? '',
          targetIntake: p.target_intake ?? '',
          budgetRange: p.budget_range ?? '',
          gpa: p.gpa ?? '',
        });
        setStatus('ready');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'PROFILE_NOT_FOUND') {
          setStatus('ready'); // no profile yet — show the empty form
        } else {
          setError(err.message);
          setStatus('error');
        }
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.saveProfile({
        targetCountries: form.targetCountries.split(',').map((c) => c.trim()).filter(Boolean),
        intendedMajor: form.intendedMajor || undefined,
        targetIntake: form.targetIntake || undefined,
        budgetRange: form.budgetRange || undefined,
        gpa: form.gpa ? Number(form.gpa) : undefined,
      });
      setStatus('saved');
    } catch (err) {
      setError(err.message);
    }
  }

  if (status === 'loading') return <p>Loading profile…</p>;

  return (
    <div>
      <div className="page-head">
        <span className="label accent">Applicant record</span>
        <h2>Your profile</h2>
      </div>
      <form onSubmit={handleSubmit} className="panel" style={{ maxWidth: 560 }}>
        {error && <p className="error">{error}</p>}
        {status === 'saved' && <p className="success">Saved.</p>}
        <label>
          <span>Target countries (comma separated)</span>
          <input type="text" placeholder="US, UK, Canada" value={form.targetCountries} onChange={(e) => setForm({ ...form, targetCountries: e.target.value })} />
        </label>
        <p className="hint" style={{ marginBottom: 0 }}>Recognized: US, UK, Canada, Australia, Netherlands, Switzerland, Germany — others just won't match any school yet.</p>
        <label>
          <span>Intended major</span>
          <select value={form.intendedMajor} onChange={(e) => setForm({ ...form, intendedMajor: e.target.value })}>
            <option value="">Select…</option>
            {MAJOR_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label>
          <span>Target intake</span>
          <input type="text" placeholder="Fall 2027" value={form.targetIntake} onChange={(e) => setForm({ ...form, targetIntake: e.target.value })} />
        </label>
        <label>
          <span>Budget range</span>
          <select value={form.budgetRange} onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}>
            <option value="">Select…</option>
            {BUDGET_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label>
          <span>GPA</span>
          <input type="number" step="0.01" min="0" max="4.5" value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} />
        </label>
        <button type="submit" className="btn accent">Save profile</button>
      </form>
    </div>
  );
}
