import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../containers/AuthContext.jsx';
import { EXTRACURRICULAR_TIERS, EXTRACURRICULAR_CATEGORIES } from '../constants/holisticOptions.js';

const EMPTY_ENTRY = { category: 'academic_competition', tier: 'tier3', title: '', description: '' };

export function AchievementsPage() {
  const { tier } = useAuth();
  const [baseProfile, setBaseProfile] = useState(null);
  const [extracurriculars, setExtracurriculars] = useState([]);
  const [researchPublications, setResearchPublications] = useState('');
  const [workExperienceYears, setWorkExperienceYears] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getProfile()
      .then((data) => {
        const p = data.profile;
        setBaseProfile(p);
        const holistic = p.holistic_profile ?? {};
        setExtracurriculars(holistic.extracurriculars ?? []);
        setResearchPublications(holistic.researchPublications ?? '');
        setWorkExperienceYears(holistic.workExperienceYears ?? '');
        setStatus('ready');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'PROFILE_NOT_FOUND') {
          setBaseProfile({});
          setStatus('ready');
        } else {
          setError(err.message);
          setStatus('error');
        }
      });
  }, []);

  function addEntry() {
    setExtracurriculars((prev) => [...prev, { ...EMPTY_ENTRY }]);
  }

  function updateEntry(index, field, value) {
    setExtracurriculars((prev) => prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)));
  }

  function removeEntry(index) {
    setExtracurriculars((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.saveProfile({
        targetCountries: baseProfile.target_countries ?? [],
        intendedMajor: baseProfile.intended_major || undefined,
        degreeLevel: baseProfile.degree_level || undefined,
        targetIntake: baseProfile.target_intake || undefined,
        budgetRange: baseProfile.budget_range || undefined,
        gpa: baseProfile.gpa ? Number(baseProfile.gpa) : undefined,
        testScores: baseProfile.test_scores ?? [],
        holisticProfile: {
          extracurriculars: extracurriculars.filter((entry) => entry.title.trim().length > 0),
          researchPublications: researchPublications === '' ? undefined : Number(researchPublications),
          workExperienceYears: workExperienceYears === '' ? undefined : Number(workExperienceYears),
        },
      });
      setStatus('saved');
    } catch (err) {
      setError(err.message);
    }
  }

  if (status === 'loading') return <p>Loading achievements…</p>;

  return (
    <div>
      <div className="page-head">
        <span className="label accent">Holistic profile</span>
        <h2>Achievements</h2>
      </div>

      <p className="hint">
        Extracurriculars, research, and work experience help predict your real odds at competitive schools — a strong
        academic record alone doesn't tell the whole story.
        {tier !== 'premium' && (
          <> Free matches are ranked from your academic profile only; <strong>Premium</strong> factors these achievements
            into every match and writes a personalized explanation for each one.</>
        )}
      </p>

      <form onSubmit={handleSubmit} className="panel" style={{ maxWidth: 640 }}>
        {error && <p className="error">{error}</p>}
        {status === 'saved' && <p className="success">Saved.</p>}

        <div>
          <p className="label">Extracurriculars & activities</p>
          {extracurriculars.map((entry, index) => (
            <div key={index} className="test-score-card">
              <div className="data-card-head">
                <h4>Activity {index + 1}</h4>
                <button type="button" className="link-button" onClick={() => removeEntry(index)}>Remove</button>
              </div>
              <label>
                <span>Title</span>
                <input
                  type="text"
                  placeholder="e.g. International Mathematical Olympiad — Silver Medal"
                  value={entry.title}
                  onChange={(e) => updateEntry(index, 'title', e.target.value)}
                />
              </label>
              <div className="test-score-sections">
                <label>
                  <span>Category</span>
                  <select value={entry.category} onChange={(e) => updateEntry(index, 'category', e.target.value)}>
                    {EXTRACURRICULAR_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Level</span>
                  <select value={entry.tier} onChange={(e) => updateEntry(index, 'tier', e.target.value)}>
                    {EXTRACURRICULAR_TIERS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="meta-line">{EXTRACURRICULAR_TIERS.find((t) => t.value === entry.tier)?.description}</p>
              <label>
                <span>Description (optional)</span>
                <textarea
                  rows={2}
                  value={entry.description ?? ''}
                  onChange={(e) => updateEntry(index, 'description', e.target.value)}
                />
              </label>
            </div>
          ))}
          <button type="button" className="btn ghost" style={{ marginTop: '0.6rem' }} onClick={addEntry}>
            Add an activity
          </button>
        </div>

        <label>
          <span>Research publications (graduate/PhD applicants)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={researchPublications}
            onChange={(e) => setResearchPublications(e.target.value)}
          />
        </label>
        <label>
          <span>Work experience, in years (if applicable)</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={workExperienceYears}
            onChange={(e) => setWorkExperienceYears(e.target.value)}
          />
        </label>

        <button type="submit" className="btn accent">Save achievements</button>
      </form>
    </div>
  );
}
