import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mapRecordToSchool } from '../../src/data-ingestion/sources/college-scorecard.js';

const fixturePath = fileURLToPath(new URL('../fixtures/college-scorecard-sample.json', import.meta.url));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));

describe('mapRecordToSchool (College Scorecard field mapping)', () => {
  it('maps a fully-populated record to the schools schema shape', () => {
    const mapped = mapRecordToSchool(fixture.results[0]);

    expect(mapped).toMatchObject({
      source: 'college_scorecard',
      externalId: '100654',
      name: 'Alabama A & M University',
      country: 'US',
      avgTuition: 18634,
      admissionRate: 0.5795,
      medianEarnings: 38983,
      completionRate: 0.2996,
    });
    expect(mapped.rawSourceData).toEqual(fixture.results[0]);
  });

  it('maps a null field (e.g. missing admission rate) to null rather than throwing or leaving it undefined', () => {
    const mapped = mapRecordToSchool(fixture.results[1]);
    expect(mapped.admissionRate).toBeNull();
  });

  it('derives major_tags from program_percentage fields above the threshold, in the same vocabulary manual_curated schools use', () => {
    const mapped = mapRecordToSchool(fixture.results[0]);
    // computer .0557, engineering .1164, business_marketing .1689 all clear the 2% threshold; legal is 0.
    expect(mapped.majorTags.sort()).toEqual(['business', 'computer_science', 'engineering']);
  });

  it('omits a tag when every contributing field is below the threshold', () => {
    const mapped = mapRecordToSchool(fixture.results[1]);
    // computer .0089 and business_marketing .0312 vs .041 legal — only legal and business clear 2%.
    expect(mapped.majorTags.sort()).toEqual(['business', 'law']);
  });

  it('never produces an "economics" tag — Scorecard has no corresponding CIP category, so this is deliberately left to manual curation', () => {
    const mapped = mapRecordToSchool(fixture.results[0]);
    expect(mapped.majorTags).not.toContain('economics');
  });
});
