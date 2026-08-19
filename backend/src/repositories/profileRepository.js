import { query } from './db.js';

export async function upsertProfile(userId, profile) {
  const { targetCountries, intendedMajor, targetIntake, budgetRange, gpa, testScores } = profile;
  const { rows } = await query(
    `INSERT INTO profiles (user_id, target_countries, intended_major, target_intake, budget_range, gpa, test_scores, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (user_id) DO UPDATE SET
       target_countries = EXCLUDED.target_countries,
       intended_major = EXCLUDED.intended_major,
       target_intake = EXCLUDED.target_intake,
       budget_range = EXCLUDED.budget_range,
       gpa = EXCLUDED.gpa,
       test_scores = EXCLUDED.test_scores,
       updated_at = now()
     RETURNING *`,
    [userId, targetCountries ?? [], intendedMajor, targetIntake, budgetRange, gpa, testScores ?? {}]
  );
  return rows[0];
}

export async function findProfileByUserId(userId) {
  const { rows } = await query(`SELECT * FROM profiles WHERE user_id = $1`, [userId]);
  return rows[0] ?? null;
}
