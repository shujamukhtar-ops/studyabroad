import { fetchAllSchools } from '../sources/college-scorecard.js';
import { upsertSchoolFromSource, propagateSchoolLinks } from '../../repositories/schoolRepository.js';
import { query } from '../../repositories/db.js';
import { logger } from '../../logging/logger.js';

// Runnable standalone: `node src/data-ingestion/jobs/sync-schools.js`
// Never called from an HTTP request handler — see ARCHITECTURE.md §6.
export async function syncSchools({ maxPages } = {}) {
  const { rows } = await query(
    `INSERT INTO data_sync_log (source, started_at, status) VALUES ($1, now(), 'running') RETURNING id`,
    ['college_scorecard']
  );
  const logId = rows[0].id;

  let processed = 0;
  let failed = 0;

  try {
    for await (const record of fetchAllSchools({ maxPages })) {
      try {
        await upsertSchoolFromSource(record);
        // Propagates website_url/net_price_calculator_url onto any sibling row for this same
        // institution from a different source (most commonly qs_rankings — see
        // propagateSchoolLinks in schoolRepository.js), so a school never loses its apply/
        // cost-calculator links just because findCandidateSchools' dedup picks that sibling
        // row over this one.
        await propagateSchoolLinks({ country: record.country, name: record.name, websiteUrl: record.websiteUrl, netPriceCalculatorUrl: record.netPriceCalculatorUrl, avgTuition: record.avgTuition });
        processed += 1;
      } catch (err) {
        failed += 1;
        logger.error('Failed to upsert school record', { err, externalId: record.externalId });
      }
    }

    await query(
      `UPDATE data_sync_log SET completed_at = now(), records_processed = $2, records_failed = $3, status = 'success' WHERE id = $1`,
      [logId, processed, failed]
    );
    logger.info('College Scorecard sync complete', { processed, failed });
  } catch (err) {
    await query(
      `UPDATE data_sync_log SET completed_at = now(), records_processed = $2, records_failed = $3, status = 'failed' WHERE id = $1`,
      [logId, processed, failed]
    );
    logger.error('College Scorecard sync aborted', { err });
    throw err;
  }

  return { processed, failed };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  syncSchools()
    .then(({ processed, failed }) => {
      console.log(`Sync complete: ${processed} processed, ${failed} failed.`);
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
