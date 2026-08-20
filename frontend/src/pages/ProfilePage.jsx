import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { COUNTRIES, DEGREE_LEVELS, MAJOR_TAGS, MAJOR_CATEGORIES, TEST_TYPES, TEST_TYPES_BY_KEY } from '../constants/profileOptions.js';

const BUDGET_OPTIONS = ['<15k', '15-30k', '30-50k', '50k+'];

// A test's headline score is either the sum of specific sections (SAT, TOEFL, and GRE's
// verbal+quant) or a number the student reports directly (ACT composite, GMAT total, IELTS/PTE
// overall, Duolingo) because those aren't simple sums of the sections shown — see
// constants/profileOptions.js TEST_TYPES totalMode.
function computeSumTotal(testType, sections) {
  if (testType.totalMode !== 'sum') return undefined;
  if (!testType.totalFrom.every((key) => typeof sections[key] === 'number')) return undefined;
  return testType.totalFrom.reduce((sum, key) => sum + sections[key], 0);
}

export function ProfilePage() {
  const [form, setForm] = useState({
    targetCountries: [],
    intendedMajor: '',
    degreeLevel: '',
    targetIntake: '',
    budgetRange: '',
    gpa: '',
  });
  const [testEntries, setTestEntries] = useState([]);
  const [addingTest, setAddingTest] = useState('');
  const [recommendedTests, setRecommendedTests] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getProfile()
      .then((data) => {
        const p = data.profile;
        setForm({
          targetCountries: p.target_countries ?? [],
          intendedMajor: p.intended_major ?? '',
          degreeLevel: p.degree_level ?? '',
          targetIntake: p.target_intake ?? '',
          budgetRange: p.budget_range ?? '',
          gpa: p.gpa ?? '',
        });
        setTestEntries(p.test_scores ?? []);
        setRecommendedTests(data.recommendedTests ?? null);
        setStatus('ready');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'PROFILE_NOT_FOUND') {
          setStatus('ready'); // no profile yet — show the empty form
        } else {
          setError(err.message);
          setStatus('error');
        }
      });
  }, []);

  function toggleCountry(code) {
    setForm((f) => ({
      ...f,
      targetCountries: f.targetCountries.includes(code)
        ? f.targetCountries.filter((c) => c !== code)
        : [...f.targetCountries, code],
    }));
  }

  function addTestScore() {
    if (!addingTest) return;
    setTestEntries((prev) => [...prev, { test: addingTest, sections: {}, total: undefined }]);
    setAddingTest('');
  }

  function removeTestScore(index) {
    setTestEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSection(index, sectionKey, rawValue) {
    const value = rawValue === '' ? undefined : Number(rawValue);
    setTestEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, sections: { ...entry.sections, [sectionKey]: value } } : entry))
    );
  }

  function updateTotal(index, rawValue) {
    const value = rawValue === '' ? undefined : Number(rawValue);
    setTestEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, total: value } : entry)));
  }

  function isRecommended(testKey) {
    if (!recommendedTests) return false;
    return recommendedTests.academic.includes(testKey) || recommendedTests.english.includes(testKey);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const testScores = testEntries.map((entry) => {
        const testType = TEST_TYPES_BY_KEY[entry.test];
        const sections = Object.fromEntries(
          Object.entries(entry.sections ?? {}).filter(([, v]) => typeof v === 'number' && !Number.isNaN(v))
        );
        const total = testType.totalMode === 'sum' ? computeSumTotal(testType, sections) : entry.total;
        return { test: entry.test, sections, total };
      });

      const data = await api.saveProfile({
        targetCountries: form.targetCountries,
        intendedMajor: form.intendedMajor || undefined,
        degreeLevel: form.degreeLevel || undefined,
        targetIntake: form.targetIntake || undefined,
        budgetRange: form.budgetRange || undefined,
        gpa: form.gpa ? Number(form.gpa) : undefined,
        testScores,
      });
      setRecommendedTests(data.recommendedTests ?? null);
      setStatus('saved');
    } catch (err) {
      setError(err.message);
    }
  }

  if (status === 'loading') return <p>Loading profile…</p>;

  const availableTests = TEST_TYPES.filter((t) => !testEntries.some((e) => e.test === t.key));

  return (
    <div>
      <div className="page-head">
        <span className="label accent">Applicant record</span>
        <h2>Your profile</h2>
      </div>
      <form onSubmit={handleSubmit} className="panel" style={{ maxWidth: 560 }}>
        {error && <p className="error">{error}</p>}
        {status === 'saved' && <p className="success">Saved.</p>}

        <div>
          <p className="label">Target countries</p>
          <ul className="checklist select-list">
            {COUNTRIES.map((c) => {
              const checked = form.targetCountries.includes(c.value);
              return (
                <li key={c.value} className={checked ? 'is-checked' : ''}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={checked ? `Remove ${c.label}` : `Add ${c.label}`}
                    className="marker"
                    onClick={() => toggleCountry(c.value)}
                  >
                    {checked && (
                      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
                        <path d="M2 8.5 6 12l8-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <button type="button" className="checklist-label" onClick={() => toggleCountry(c.value)}>
                    {c.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <label>
          <span>Degree level</span>
          <select value={form.degreeLevel} onChange={(e) => setForm({ ...form, degreeLevel: e.target.value })}>
            <option value="">Select…</option>
            {DEGREE_LEVELS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </label>

        <label>
          <span>Intended major</span>
          <select value={form.intendedMajor} onChange={(e) => setForm({ ...form, intendedMajor: e.target.value })}>
            <option value="">Select…</option>
            {MAJOR_CATEGORIES.map((category) => (
              <optgroup key={category} label={category}>
                {MAJOR_TAGS.filter((m) => m.category === category).map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label>
          <span>Target intake</span>
          <input type="text" placeholder="Fall 2027" value={form.targetIntake} onChange={(e) => setForm({ ...form, targetIntake: e.target.value })} />
        </label>
        <label>
          <span>Budget range</span>
          <select value={form.budgetRange} onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}>
            <option value="">Select…</option>
            {BUDGET_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label>
          <span>GPA</span>
          <input type="number" step="0.01" min="0" max="4.5" value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} />
        </label>

        <div>
          <p className="label">Test scores</p>

          {recommendedTests?.notes?.length > 0 && (
            <div className="hint">
              {recommendedTests.notes.map((n) => (
                <p key={n.country} className="hint-line"><strong>{n.country}:</strong> {n.note}</p>
              ))}
            </div>
          )}

          {testEntries.map((entry, index) => {
            const testType = TEST_TYPES_BY_KEY[entry.test];
            const sumTotal = computeSumTotal(testType, entry.sections ?? {});
            return (
              <div key={index} className="test-score-card">
                <div className="data-card-head">
                  <h4>{testType.label}</h4>
                  <button type="button" className="link-button" onClick={() => removeTestScore(index)}>Remove</button>
                </div>
                {testType.sections.length > 0 && (
                  <div className="test-score-sections">
                    {testType.sections.map((sec) => (
                      <label key={sec.key}>
                        <span>{sec.label}</span>
                        <input
                          type="number"
                          min={sec.min}
                          max={sec.max}
                          step={sec.step}
                          value={entry.sections?.[sec.key] ?? ''}
                          onChange={(e) => updateSection(index, sec.key, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                )}
                {testType.totalMode === 'sum' ? (
                  <p className="meta-line">{testType.totalLabel}: <strong>{sumTotal ?? '—'}</strong></p>
                ) : (
                  <label>
                    <span>{testType.totalLabel}</span>
                    <input
                      type="number"
                      min={testType.totalMin}
                      max={testType.totalMax}
                      step={testType.totalStep}
                      value={entry.total ?? ''}
                      onChange={(e) => updateTotal(index, e.target.value)}
                    />
                  </label>
                )}
              </div>
            );
          })}

          <div className="test-score-add-row">
            <label>
              <span>Add a test score</span>
              <select value={addingTest} onChange={(e) => setAddingTest(e.target.value)}>
                <option value="">Select a test…</option>
                {availableTests.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}{isRecommended(t.key) ? ' (recommended)' : ''}</option>
                ))}
              </select>
            </label>
            <button type="button" className="btn ghost" onClick={addTestScore} disabled={!addingTest}>Add</button>
          </div>
        </div>

        <button type="submit" className="btn accent">Save profile</button>
      </form>
    </div>
  );
}
