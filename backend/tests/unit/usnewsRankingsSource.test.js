import { describe, it, expect } from 'vitest';
import { parseUsNewsRankings } from '../../src/data-ingestion/sources/usnews-rankings.js';

const HEADER = 'acceptance_rate,act_avg,act_range,business_rep_score,city,control,cost_after_aid,engineering_rep_score,enrollment,hs_gpa_avg,id,is_public,is_ranked,is_tied,name,pct_receiving_aid,profile_url,rank_display,rank_numeric,ranking_year,region,sat_avg,sat_range,school_type,source,state,tuition,url_name,zip';

function csvOf(row) {
  return `${HEADER}\n${row}`;
}

describe('parseUsNewsRankings netPriceAfterAid/pctReceivingAid extraction', () => {
  it('promotes cost_after_aid and pct_receiving_aid to top-level fields', () => {
    const row = '5,34,,,Princeton,private,13939,4.2,5813,3.9,2627,false,true,false,Princeton University,67,https://www.usnews.com/best-colleges/princeton-university,#1,1,2026,,1510,,national-universities,usnews.com,NJ,65210,princeton-university,08544';
    const [school] = parseUsNewsRankings(csvOf(row));
    expect(school.netPriceAfterAid).toBe(13939);
    expect(school.pctReceivingAid).toBe(67);
  });

  it('maps a blank cost_after_aid to null rather than throwing or NaN', () => {
    const row = '5,34,,,Princeton,private,,4.2,5813,3.9,2627,false,true,false,Princeton University,67,https://www.usnews.com/best-colleges/princeton-university,#1,1,2026,,1510,,national-universities,usnews.com,NJ,65210,princeton-university,08544';
    const [school] = parseUsNewsRankings(csvOf(row));
    expect(school.netPriceAfterAid).toBeNull();
  });

  it('does not duplicate netPriceAfterAid/pctReceivingAid into rawSourceData', () => {
    const row = '5,34,,,Princeton,private,13939,4.2,5813,3.9,2627,false,true,false,Princeton University,67,https://www.usnews.com/best-colleges/princeton-university,#1,1,2026,,1510,,national-universities,usnews.com,NJ,65210,princeton-university,08544';
    const [school] = parseUsNewsRankings(csvOf(row));
    expect(school.rawSourceData).not.toHaveProperty('costAfterAid');
    expect(school.rawSourceData).not.toHaveProperty('pctReceivingAid');
  });
});
