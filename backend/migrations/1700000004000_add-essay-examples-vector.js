// Adds pgvector-backed few-shot retrieval for Stage 2 (personalized) essay feedback — the
// seam schema.sql called out from the start ("Seam for later: `CREATE EXTENSION IF NOT
// EXISTS vector;`") without committing to a dimension. We now pick 1024, matching Amazon
// Titan Text Embeddings V2 (Bedrock) — see embeddingProvider.js.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE essay_examples (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        intended_major  TEXT NOT NULL,
        outcome         TEXT NOT NULL CHECK (outcome IN ('accepted', 'rejected')),
        text            TEXT NOT NULL,
        notes           TEXT NOT NULL,
        embedding       vector(1024)
    );

    CREATE INDEX idx_essay_examples_embedding ON essay_examples
        USING hnsw (embedding vector_cosine_ops);
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS essay_examples;
    DROP EXTENSION IF EXISTS vector;
  `);
}
