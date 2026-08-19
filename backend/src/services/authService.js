import bcrypt from 'bcrypt';
import { createUser, findUserByEmail } from '../repositories/userRepository.js';
import { signToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;

export async function register({ email, password, homeCountry }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ email, passwordHash, homeCountry });
  return { user, token: signToken(user) };
}

export async function login({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }
  const { password_hash, ...safeUser } = user;
  return { user: safeUser, token: signToken(safeUser) };
}
