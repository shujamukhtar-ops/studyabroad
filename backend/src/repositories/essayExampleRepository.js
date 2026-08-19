import { query } from './db.js';

// pg has no native vector type — pgvector accepts the standard textual input format for
// the type, `[v1,v2,...]`, so we serialize the array ourselves and cast it server-side.
function toVectorLiteral(embeddingArray) {
  return `[${embeddingArray.join(',')}]`;
}

// Nearest examples for this major by cosine distance (`<=>`, pgvector's cosine-distance
// operator — smaller is more similar), backing HNSW index built with vector_cosine_ops.
export async function findSimilarExamples(embeddingArray, major, limit = 3) {
  const { rows } = await query(
    `SELECT id, outcome, text, notes
     FROM essay_examples
     WHERE intended_major = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [major, toVectorLiteral(embeddingArray), limit]
  );
  return rows;
}

export async function insertExample({ intendedMajor, outcome, text, notes, embedding }) {
  const { rows } = await query(
    `INSERT INTO essay_examples (intended_major, outcome, text, notes, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)
     RETURNING *`,
    [intendedMajor, outcome, text, notes, toVectorLiteral(embedding)]
  );
  return rows[0];
}

export async function deleteAllExamples() {
  await query(`DELETE FROM essay_examples`);
}
