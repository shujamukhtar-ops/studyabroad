import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../containers/AuthContext.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(form);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <span className="label accent">Welcome back</span>
        <h2>Log in</h2>
      </div>
      <form onSubmit={handleSubmit} className="panel">
        {error && <p className="error">{error}</p>}
        <label>
          <span>Email</span>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          <span>Password</span>
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button type="submit" className="btn accent">Log in</button>
      </form>
    </div>
  );
}
