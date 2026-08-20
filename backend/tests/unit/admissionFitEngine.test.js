import { describe, it, expect } from 'vitest';
import {
  computeAcademicIndex,
  computeHolisticIndex,
  computeFit,
  explainFit,
  selectBalancedShortlist,
} from '../../src/ai-engine/admissionFitEngine.js';

describe('computeAcademicIndex', () => {
  it('returns null when there is no GPA or test score at all', () => {
    expect(computeAcademicIndex({ gpa: undefined, degreeLevel: 'undergraduate', testScores: [] })).toBeNull();
  });

  it('blends GPA and SAT for an undergraduate with both', () => {
    const index = computeAcademicIndex({
      gpa: 4.0,
      degreeLevel: 'undergraduate',
      testScores: [{ test: 'sat', sections: { math: 800, reading_writing: 800 }, total: 1600 }],
    });
    // GPA norm 100, SAT norm 100 -> blended 100
    expect(index).toBe(100);
  });

  it('falls back to GPA alone when no test score is present (test-optional)', () => {
    const index = computeAcademicIndex({ gpa: 2.0, degreeLevel: 'undergraduate', testScores: [] });
    expect(index).toBe(50); // 2.0/4.0 * 100
  });

  it('falls back to the test score alone when GPA is missing', () => {
    const index = computeAcademicIndex({
      gpa: undefined,
      degreeLevel: 'undergraduate',
      testScores: [{ test: 'sat', sections: {}, total: 1600 }],
    });
    expect(index).toBe(100);
  });

  it('converts an ACT composite to an SAT-equivalent when no SAT is reported', () => {
    const withAct = computeAcademicIndex({
      gpa: undefined,
      degreeLevel: 'undergraduate',
      testScores: [{ test: 'act', sections: {}, total: 36 }],
    });
    const withEquivalentSat = computeAcademicIndex({
      gpa: undefined,
      degreeLevel: 'undergraduate',
      testScores: [{ test: 'sat', sections: {}, total: 30 * 36 + 510 }],
    });
    expect(withAct).toBe(withEquivalentSat);
  });

  it('re-derives an SAT total from sections when total was not precomputed', () => {
    const index = computeAcademicIndex({
      gpa: undefined,
      degreeLevel: 'undergraduate',
      testScores: [{ test: 'sat', sections: { math: 700, reading_writing: 700 }, total: undefined }],
    });
    expect(index).not.toBeNull();
  });

  it('uses GRE (verbal+quant) for a graduate student, not the undergraduate SAT path', () => {
    const index = computeAcademicIndex({
      gpa: 4.0,
      degreeLevel: 'graduate',
      testScores: [
        { test: 'sat', sections: {}, total: 1600 }, // must be ignored for a graduate profile
        { test: 'gre', sections: { verbal: 170, quant: 170 }, total: 340 },
      ],
    });
    expect(index).toBe(100); // GPA norm 100, GRE norm 100
  });

  it('falls back to GMAT when no GRE is reported for a graduate student', () => {
    const index = computeAcademicIndex({
      gpa: undefined,
      degreeLevel: 'graduate',
      testScores: [{ test: 'gmat', sections: {}, total: 805 }],
    });
    expect(index).toBe(100);
  });
});

describe('computeHolisticIndex', () => {
  it('returns null when nothing has been entered', () => {
    expect(computeHolisticIndex({})).toBeNull();
    expect(computeHolisticIndex(undefined)).toBeNull();
  });

  it('weights a tier1 activity far above a tier4 one', () => {
    const tier1 = computeHolisticIndex({ extracurriculars: [{ category: 'academic_competition', tier: 'tier1', title: 'IMO Medal' }] });
    const tier4 = computeHolisticIndex({ extracurriculars: [{ category: 'other', tier: 'tier4', title: 'Club member' }] });
    expect(tier1).toBeGreaterThan(tier4);
  });

  it('caps how many activities can keep raising the score', () => {
    const sixTier1 = computeHolisticIndex({
      extracurriculars: Array.from({ length: 6 }, (_, i) => ({ category: 'other', tier: 'tier1', title: `Activity ${i}` })),
    });
    const tenTier1 = computeHolisticIndex({
      extracurriculars: Array.from({ length: 10 }, (_, i) => ({ category: 'other', tier: 'tier1', title: `Activity ${i}` })),
    });
    expect(tenTier1).toBe(sixTier1);
  });

  it('factors in research publications and work experience', () => {
    const withPubs = computeHolisticIndex({ extracurriculars: [], researchPublications: 3 });
    const withWork = computeHolisticIndex({ extracurriculars: [], workExperienceYears: 2 });
    expect(withPubs).toBeGreaterThan(0);
    expect(withWork).toBeGreaterThan(0);
  });

  it('never exceeds 100', () => {
    const index = computeHolisticIndex({
      extracurriculars: Array.from({ length: 10 }, (_, i) => ({ category: 'other', tier: 'tier1', title: `Activity ${i}` })),
      researchPublications: 10,
      workExperienceYears: 10,
    });
    expect(index).toBeLessThanOrEqual(100);
  });
});

describe('computeFit', () => {
  it('returns null when there is no academic index to judge with', () => {
    expect(computeFit({ academicIndex: null, holisticIndex: null }, { world_rank: 1 })).toBeNull();
  });

  it('calls an ultra-selective school (QS top 20) a Reach for an average academic profile', () => {
    const fit = computeFit({ academicIndex: 60, holisticIndex: null }, { world_rank: 5 });
    expect(fit.category).toBe('Reach');
  });

  it('calls an ultra-selective school a Target (or better) for an exceptional academic profile', () => {
    const fit = computeFit({ academicIndex: 96, holisticIndex: null }, { world_rank: 5 });
    expect(['Target', 'Safety']).toContain(fit.category);
  });

  it('calls a school with no selectivity signal at all a Target for an average profile', () => {
    const fit = computeFit({ academicIndex: 55, holisticIndex: null }, {});
    expect(fit.category).toBe('Target');
  });

  it('falls back to admission_rate when world_rank is absent', () => {
    const veryLowRate = computeFit({ academicIndex: 60, holisticIndex: null }, { admission_rate: 0.05 });
    const highRate = computeFit({ academicIndex: 60, holisticIndex: null }, { admission_rate: 0.85 });
    expect(veryLowRate.category).toBe('Reach');
    expect(highRate.category).toBe('Safety');
  });

  it('prefers a school’s own reported sat_avg/hs_gpa_avg over its world_rank band', () => {
    // A 3.5-GPA-equivalent academic index (87.5) clears the QS top-20 world_rank band (90 is
    // the threshold, so this alone would already read close to Reach territory), but should
    // read as more clearly a Reach once the school's own reported averages (near a 4.0/1550
    // student body) are available — the concrete "3.5 GPA at MIT" example this engine exists
    // to model correctly, now checked against the school's real numbers instead of a rank band.
    const withoutAverages = computeFit({ academicIndex: 87.5, holisticIndex: null }, { world_rank: 5 });
    const withAverages = computeFit(
      { academicIndex: 87.5, holisticIndex: null },
      { world_rank: 5, sat_avg: 1550, hs_gpa_avg: 3.95 }
    );
    expect(withAverages.threshold).toBeGreaterThan(withoutAverages.threshold);
  });

  it('calls a school a Safety once a student’s academic index clears its own reported averages', () => {
    const fit = computeFit({ academicIndex: 95, holisticIndex: null }, { world_rank: 300, sat_avg: 1200, hs_gpa_avg: 3.4 });
    expect(fit.category).toBe('Safety');
  });

  it('falls back to the world_rank band when a school has no reported averages at all', () => {
    const fit = computeFit({ academicIndex: 60, holisticIndex: null }, { world_rank: 5, sat_avg: null, hs_gpa_avg: null });
    expect(fit.category).toBe('Reach');
  });

  it('gives a smaller profileDistance the closer a student is to a school’s own reported averages', () => {
    // A student whose academic index sits right at the school's own threshold is the closest
    // possible match; one whose index is far below (Reach) or far above (Safety) is equally
    // "far" in the other direction — profileDistance is symmetric, unlike fitScore.
    const rightAtThreshold = computeFit({ academicIndex: 90, holisticIndex: null }, { sat_avg: 1520 });
    const wellBelow = computeFit({ academicIndex: 60, holisticIndex: null }, { sat_avg: 1520 });
    const wellAbove = computeFit({ academicIndex: 99, holisticIndex: null }, { sat_avg: 1520 });
    expect(rightAtThreshold.profileDistance).toBeLessThan(wellBelow.profileDistance);
    expect(rightAtThreshold.profileDistance).toBeLessThan(wellAbove.profileDistance);
  });

  it('blends in the holistic index only when it is provided', () => {
    const academicOnly = computeFit({ academicIndex: 70, holisticIndex: null }, { world_rank: 30 });
    const withHolistic = computeFit({ academicIndex: 70, holisticIndex: 100 }, { world_rank: 30 });
    expect(withHolistic.usedHolistic).toBe(true);
    expect(academicOnly.usedHolistic).toBe(false);
    expect(withHolistic.blendedIndex).toBeGreaterThan(academicOnly.blendedIndex);
  });
});

describe('selectBalancedShortlist', () => {
  // 20 Safety schools (world_rank 500-2000) and 3 Reach schools (world_rank 1-3), like a
  // strong student's real candidate pool would look once every safety-tier school clears
  // the bar and every top-20 school doesn't.
  const REACH_SCHOOLS = [1, 2, 3].map((rank) => ({ id: `reach-${rank}`, world_rank: rank }));
  const SAFETY_SCHOOLS = Array.from({ length: 20 }, (_, i) => ({ id: `safety-${i}`, world_rank: 500 + i * 10 }));
  const CANDIDATES = [...REACH_SCHOOLS, ...SAFETY_SCHOOLS];
  const FITS = Object.fromEntries([
    ...REACH_SCHOOLS.map((s) => [s.id, { category: 'Reach' }]),
    ...SAFETY_SCHOOLS.map((s) => [s.id, { category: 'Safety' }]),
  ]);

  it('does not let Safety schools crowd out every Reach school', () => {
    const shortlist = selectBalancedShortlist(CANDIDATES, FITS, 15);
    const reachCount = shortlist.filter((s) => s.id.startsWith('reach-')).length;
    expect(reachCount).toBeGreaterThan(0);
  });

  it('never exceeds the requested limit', () => {
    const shortlist = selectBalancedShortlist(CANDIDATES, FITS, 15);
    expect(shortlist.length).toBeLessThanOrEqual(15);
  });

  it('backfills from leftovers when a category quota is short', () => {
    // No Target/Reach schools at all here — Safety's quota (3) alone can't reach the limit
    // (15), so it must pull in the rest of Safety as backfill rather than stopping short.
    const onlySafety = SAFETY_SCHOOLS;
    const onlySafetyFits = Object.fromEntries(SAFETY_SCHOOLS.map((s) => [s.id, { category: 'Safety' }]));
    const shortlist = selectBalancedShortlist(onlySafety, onlySafetyFits, 15);
    expect(shortlist.length).toBe(15);
  });

  it('preserves each category’s existing (world_rank) order', () => {
    const shortlist = selectBalancedShortlist(CANDIDATES, FITS, 15);
    const reachIds = shortlist.filter((s) => s.id.startsWith('reach-')).map((s) => s.id);
    expect(reachIds).toEqual(['reach-1', 'reach-2', 'reach-3']);
  });
});

describe('explainFit', () => {
  it('prompts for missing profile data when fit is null', () => {
    const text = explainFit(null, { name: 'Test University' });
    expect(text).toContain('Test University');
    expect(text.toLowerCase()).toContain('gpa');
  });

  it('mentions the school name and category for a computed fit', () => {
    const fit = { category: 'Target', fitScore: 55 };
    const text = explainFit(fit, { name: 'Test University' });
    expect(text).toContain('Test University');
    expect(text.toLowerCase()).toContain('target');
  });
});
