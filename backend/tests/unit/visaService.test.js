import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/visaRepository.js', () => ({
  findVisaRequirement: vi.fn(),
}));

const { findVisaRequirement } = await import('../../src/repositories/visaRepository.js');
const { getCuratedVisaChecklist } = await import('../../src/services/visaService.js');

const UK_REQUIREMENT = { checklist_json: ['Get a CAS'], last_reviewed_at: null, source_url: 'https://gov.uk' };

beforeEach(() => {
  vi.clearAllMocks();
  // findVisaRequirement is an exact match against the canonical destination_country value in
  // the DB ('UK') — these tests exist to prove getCuratedVisaChecklist normalizes free-text
  // input to that value before querying, not to re-test the repository itself.
  findVisaRequirement.mockImplementation(async (destination) => (destination === 'UK' ? UK_REQUIREMENT : null));
});

describe('getCuratedVisaChecklist', () => {
  it('finds the UK checklist when the user types the canonical value', async () => {
    const result = await getCuratedVisaChecklist('UK');
    expect(findVisaRequirement).toHaveBeenCalledWith('UK');
    expect(result.curated).toBe(true);
  });

  it('finds the UK checklist when the user types the full country name', async () => {
    const result = await getCuratedVisaChecklist('United Kingdom');
    expect(findVisaRequirement).toHaveBeenCalledWith('UK');
    expect(result.curated).toBe(true);
  });

  it('finds the UK checklist regardless of case', async () => {
    await getCuratedVisaChecklist('united kingdom');
    expect(findVisaRequirement).toHaveBeenCalledWith('UK');
  });

  it('still echoes back exactly what the user typed, not the canonical value', async () => {
    const result = await getCuratedVisaChecklist('United Kingdom');
    expect(result.destination).toBe('United Kingdom');
  });

  it('passes an unrecognized destination through unchanged and still 404s', async () => {
    await expect(getCuratedVisaChecklist('Narnia')).rejects.toMatchObject({ code: 'VISA_DATA_UNAVAILABLE' });
    expect(findVisaRequirement).toHaveBeenCalledWith('Narnia');
  });
});
