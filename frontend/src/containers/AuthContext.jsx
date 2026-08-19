import { createContext, useContext, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

// The backend only returns the full user object from /login and /register. To restore a
// session from a token already in localStorage (e.g. after a page refresh) without an
// extra network round-trip, decode the JWT payload client-side — it's not verified here,
// only read for UI state; the server independently verifies the token on every request.
function userFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { id: payload.sub, tier: payload.tier };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => userFromToken(getToken()));

  const register = useCallback(async (payload) => {
    const { user: newUser, token } = await api.register(payload);
    setToken(token);
    setUser(newUser);
    return newUser;
  }, []);

  const login = useCallback(async (payload) => {
    const { user: loggedInUser, token } = await api.login(payload);
    setToken(token);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, tier: user?.tier ?? 'basic', isAuthenticated: Boolean(user), register, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
