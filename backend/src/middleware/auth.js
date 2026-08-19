import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, tier: user.tier }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

// Populates req.user = { id, tier } from a Bearer token or the `token` httpOnly cookie.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  const token = bearer ?? req.cookies?.token;

  if (!token) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Login required.'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, tier: payload.tier };
    next();
  } catch {
    next(new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired session.'));
  }
}
