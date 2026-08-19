import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({ connectionString: env.databaseUrl });

// Every repository queries through this so tests can spy/mock a single choke point,
// and so no other layer ever imports `pg` directly.
export async function query(text, params) {
  return pool.query(text, params);
}
