import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { getProvider } from '../../ai-engine/provider.js';
import { BedrockProvider } from '../../ai-engine/BedrockProvider.js';
import { generateEmbedding } from '../../ai-engine/embeddingProvider.js';
import { insertExample } from '../../repositories/essayExampleRepository.js';
import { query } from '../../repositories/db.js';
import { logger } from '../../logging/logger.js';

// One-off admin script, never called from an HTTP request handler (see ARCHITECTURE.md
// §6 and sync-schools.js for the same pattern) — populates essay_examples with REAL
// admissions outcomes for Stage 2 RAG retrieval (see essayExampleRepository.js,
// analyzePersonalized.js). Unlike seed-essays.js's Math.random() placeholder vectors,
// this generates real embeddings and real admissions-officer notes via Bedrock, so it
// only works once AI_PROVIDER=bedrock and BedrockProvider/embeddingProvider's Bedrock
// branches are actually implemented — until then this deliberately throws rather than
// silently writing fake vectors into the production table (see BedrockProvider.js /
// embeddingProvider.js "TODO(real integration)" comments).
//
// Expected CSV columns: major,outcome,text
//   - major: one of the canonical major tags this app already uses (see sopRubric.js
//     MAJOR_KEYWORDS) — must match what profiles.intended_major actually stores, since
//     findSimilarExamples() filters on an exact match against it.
//   - outcome: 'accepted' or 'rejected'
//   - text: the essay body
//
// Run: node src/data-ingestion/jobs/ingest-real-essays.js [path/to/real_sops.csv]
export async function ingestRealEssays(csvPath = './real_sops.csv') {
  const provider = getProvider();
  if (provider !== BedrockProvider) {
    throw new Error(
      'ingestRealEssays() requires AI_PROVIDER=bedrock — generating admissions notes and ' +
        'embeddings from MockProvider would write meaningless placeholder data into the ' +
        'production essay_examples table. Set AI_PROVIDER=bedrock and re-run.'
    );
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const records = parse(fileContent, { columns: true, skip_empty_lines: true });

  const { rows } = await query(
    `INSERT INTO data_sync_log (source, started_at, status) VALUES ($1, now(), 'running') RETURNING id`,
    ['real_essay_ingestion']
  );
  const logId = rows[0].id;

  let processed = 0;
  let failed = 0;

  for (const row of records) {
    try {
      logger.info('Processing essay', { major: row.major, outcome: row.outcome });

      // Admissions-officer-style rationale, generated once from the real outcome + essay —
      // this is what fills essay_examples.notes and gets shown to the LLM at Stage 2 time
      // via the <AdmissionsCommitteeNotes> block (see analyzePersonalized.js).
      const notePrompt = `Act as an admissions officer. This essay was ${row.outcome} for a ${row.major} program. Write a 2-sentence note explaining WHY it was ${row.outcome}, focusing on specificity, structure, and depth.\n\nEssay: ${row.text}`;
      const notes = await BedrockProvider.invoke(notePrompt);

      const embedding = await generateEmbedding(row.text, BedrockProvider);

      await insertExample({
        intendedMajor: row.major,
        outcome: row.outcome,
        text: row.text,
        notes,
        embedding,
      });

      processed += 1;
    } catch (err) {
      failed += 1;
      logger.error('Failed to ingest essay row', { err, major: row.major, outcome: row.outcome });
    }
  }

  await query(
    `UPDATE data_sync_log SET completed_at = now(), records_processed = $2, records_failed = $3, status = $4 WHERE id = $1`,
    [logId, processed, failed, failed > 0 && processed === 0 ? 'failed' : 'success']
  );
  logger.info('Real essay ingestion complete', { processed, failed });

  return { processed, failed };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const csvPath = process.argv[2] ?? './real_sops.csv';
  ingestRealEssays(csvPath)
    .then(({ processed, failed }) => {
      console.log(`Ingestion complete: ${processed} processed, ${failed} failed.`);
      process.exit(failed > 0 && processed === 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
