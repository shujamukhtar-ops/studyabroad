import { query } from './db.js';

export async function upsertProfile(userId, profile) {
  const { targetCountries, intendedMajor, degreeLevel, targetIntake, budgetRange, gpa, testScores, holisticProfile } = profile;
  const { rows } = await query(
    `INSERT INTO profiles (user_id, target_countries, intended_major, degree_level, target_intake, budget_range, gpa, test_scores, holistic_profile, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (user_id) DO UPDATE SET
       target_countries = EXCLUDED.target_countries,
       intended_major = EXCLUDED.intended_major,
       degree_level = EXCLUDED.degree_level,
       target_intake = EXCLUDED.target_intake,
       budget_range = EXCLUDED.budget_range,
       gpa = EXCLUDED.gpa,
       test_scores = EXCLUDED.test_scores,
       holistic_profile = EXCLUDED.holistic_profile,
       updated_at = now()
     RETURNING *`,
    [userId, targetCountries ?? [], intendedMajor, degreeLevel, targetIntake, budgetRange, gpa, JSON.stringify(testScores ?? []), JSON.stringify(holisticProfile ?? {})]
  );
  return rows[0];
}

export async function findProfileByUserId(userId) {
  const { rows } = await query(`SELECT * FROM profiles WHERE user_id = $1`, [userId]);
  return rows[0] ?? null;
}
