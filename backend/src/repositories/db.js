import pg from 'pg';
import { env } from '../config/env.js';

// node-postgres returns NUMERIC/DECIMAL columns (oid 1700) as strings by default, to avoid
// silently losing precision on values too large for a JS float. None of this app's NUMERIC
// columns (profiles.gpa, schools.avg_tuition/admission_rate, match_results.score) are ever
// that large, and several call sites — ai-engine/admissionFitEngine.js's `typeof gpa ===
// 'number'` / `typeof school.admission_rate === 'number'` checks in particular — need a real
// number, not a numeric-looking string, or they silently (no error) treat the value as
// missing. Parsing numerics as floats app-wide here is one fix for that whole class of bug,
// instead of coercing defensively at every read site.
pg.types.setTypeParser(1700, (value) => (value === null ? null : parseFloat(value)));

// node-postgres parses DATE (oid 1082) into a JS Date at UTC midnight by default, and
// JSON.stringify-ing a Date always emits the full ISO instant — so scholarships.deadline came
// back over the API as e.g. "2027-05-01T04:00:00.000Z" (the -04:00 local offset baked into a
// wall-clock "date"), unreadable in the UI and one JS-Date round trip away from silently
// displaying the wrong calendar day in another timezone. Returning the raw 'YYYY-MM-DD'
// string Postgres already sends avoids the parse/reformat entirely — there's no time
// component to a DATE, so there's nothing a Date object adds here.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({ connectionString: env.databaseUrl });

// Every repository queries through this so tests can spy/mock a single choke point,
// and so no other layer ever imports `pg` directly.
export async function query(text, params) {
  return pool.query(text, params);
}
