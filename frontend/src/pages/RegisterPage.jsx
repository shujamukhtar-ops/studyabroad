import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../containers/AuthContext.jsx';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', homeCountry: '' });
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await register(form);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <span className="label accent">Get started</span>
        <h2>Create an account</h2>
      </div>
      <form onSubmit={handleSubmit} className="panel">
        {error && <p className="error">{error}</p>}
        <label>
          <span>Email</span>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          <span>Password</span>
          <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <label>
          <span>Home country</span>
          <input type="text" required value={form.homeCountry} onChange={(e) => setForm({ ...form, homeCountry: e.target.value })} />
        </label>
        <button type="submit" className="btn accent">Register</button>
      </form>
    </div>
  );
}
