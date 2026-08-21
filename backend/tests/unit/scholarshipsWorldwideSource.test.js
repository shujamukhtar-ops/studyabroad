import { describe, it, expect } from 'vitest';
import { parseScholarshipsWorldwide } from '../../src/data-ingestion/sources/scholarships-worldwide.js';

function archiveOf(rows) {
  return JSON.stringify({ scholarships: rows });
}

function row(overrides = {}) {
  return {
    title: 'Some Scholarship',
    url: 'N/A',
    deadline: 'N/A',
    award: 'N/A',
    eligibility: 'N/A',
    last_updated: 'N/A',
    status: 'Active',
    category: 'International Scholarship',
    location: 'united-states',
    ...overrides,
  };
}

describe('parseScholarshipsWorldwide degreeLevels extraction', () => {
  it('maps Bachelor/Master/Phd tokens to this app\'s undergraduate/graduate/phd vocabulary', () => {
    const [result] = parseScholarshipsWorldwide(archiveOf([row({ title: 'A', eligibility: 'Master, Bachelor, Phd' })]));
    expect(result.degreeLevels.sort()).toEqual(['graduate', 'phd', 'undergraduate']);
  });

  it('extracts a single degree level correctly', () => {
    const [result] = parseScholarshipsWorldwide(archiveOf([row({ title: 'B', eligibility: 'Phd' })]));
    expect(result.degreeLevels).toEqual(['phd']);
  });

  it('does not map "Course" (a non-degree short course) to any degree level', () => {
    const [result] = parseScholarshipsWorldwide(archiveOf([row({ title: 'C', eligibility: 'Master, Bachelor, Course' })]));
    expect(result.degreeLevels.sort()).toEqual(['graduate', 'undergraduate']);
  });

  it('leaves degreeLevels empty (open to all) when eligibility is only "Course"', () => {
    const [result] = parseScholarshipsWorldwide(archiveOf([row({ title: 'D', eligibility: 'Course' })]));
    expect(result.degreeLevels).toEqual([]);
  });

  it('leaves degreeLevels empty when eligibility is a leaked funding-status value, not a degree level', () => {
    const [result] = parseScholarshipsWorldwide(archiveOf([row({ title: 'E', eligibility: 'Not Funded' })]));
    expect(result.degreeLevels).toEqual([]);
  });

  it('leaves degreeLevels empty when eligibility is "N/A"', () => {
    const [result] = parseScholarshipsWorldwide(archiveOf([row({ title: 'F', eligibility: 'N/A' })]));
    expect(result.degreeLevels).toEqual([]);
  });
});
