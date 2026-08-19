import { query } from './db.js';

export async function createUser({ email, passwordHash, homeCountry }) {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, home_country)
     VALUES ($1, $2, $3)
     RETURNING id, email, home_country, tier, created_at`,
    [email, passwordHash, homeCountry]
  );
  return rows[0];
}

export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, password_hash, home_country, tier, created_at FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id) {
  const { rows } = await query(
    `SELECT id, email, home_country, tier, created_at FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
