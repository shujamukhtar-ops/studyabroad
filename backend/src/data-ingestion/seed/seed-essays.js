import { deleteAllExamples, insertExample } from '../../repositories/essayExampleRepository.js';
import { logger } from '../../logging/logger.js';

// Dev/demo fixtures for Stage 2 RAG retrieval (see essayExampleRepository.js,
// analyzePersonalized.js), sourced from MIT Comm Lab guidance and public admissions-essay
// benchmarks. Their embeddings are plain Math.random() vectors, not real semantic
// embeddings of `text` — that's fine for local dev, where AI_PROVIDER=mock never reads
// embedding.length correctness beyond querying pgvector's HNSW index end-to-end, but it
// also means cosine-similarity ranking among these rows is meaningless. Real production
// data needs real embeddings — see jobs/ingest-real-essays.js.
//
// NOTE: 'public_health' is not in MAJOR_TAGS (backend/src/constants/majors.js) — a
// profile's intended_major is validated against that enum, so no real profile can ever be
// saved with 'public_health' and this row can never actually be retrieved by
// findSimilarExamples() until that enum is extended. Left in as requested; flagging so it
// isn't mistaken for a bug in the retrieval query itself.
const ESSAY_EXAMPLES = [
  {
    intendedMajor: 'computer_science',
    outcome: 'accepted',
    text: 'During my project on compiler design, I collaborated with other group members to develop a user-friendly Python wrapper for a 10,000-line Fortran library. This work, currently under review at ICML, convinced me that pursuing doctoral research on trustworthy AI is where I can make my greatest contribution. At your program, I plan to extend this work with Professor Smith\'s group, particularly building on her recent NeurIPS paper on compositional robustness.',
    notes: 'Accepted: Starts with current research activity. Shows specific technical knowledge (Python wrapper for Fortran library, ICML). Names specific faculty and their recent work. Proves they understand what graduate school actually is.',
  },
  {
    intendedMajor: 'computer_science',
    outcome: 'rejected',
    text: 'Ever since I was a child playing video games, I have been fascinated by technology. I graduated with a degree in Computer Science, where I completed coursework in data structures, algorithms, and machine learning. I am now applying to this PhD program because its world-class faculty and cutting-edge facilities will help me achieve my future goals. I possess an unwavering and lifelong passion for scientific inquiry.',
    notes: 'Rejected: Uses cliché opening (\'Ever since I was a child\'). Reads like a resume recap. Tells instead of shows. Uses overly flowery, inauthentic language (\'unwavering and lifelong passion\') and vague generalizations (\'world-class faculty\').',
  },
  {
    intendedMajor: 'public_health',
    outcome: 'accepted',
    text: 'In the rural clinic where I worked as a research assistant, I watched a nurse explain a treatment plan to a mother who could not read the discharge instructions. My interest in public health policy did not begin in a classroom; it began in that room. I helped build a dataset tracking prenatal visit attendance against transportation access. I am drawn to this program because of its required practicum in community health systems, which speaks directly to the thousands of mothers like her.',
    notes: 'Accepted: Opens with a specific scene rather than a general statement. Connects a real professional question to their own experience. Names specific, real features of the program (a practicum) rather than vague praise.',
  },
  {
    intendedMajor: 'engineering',
    outcome: 'accepted',
    text: 'After graduation, I joined SolarTech, where I contributed to the design of solar panel arrays for commercial properties. My work on optimizing solar panel designs led to a 15% increase in energy efficiency for one of our client projects. Inspired by a question that arose during this project, I proposed a new research direction to the PI of my lab. At your Master\'s program, I am eager to collaborate with Dr. Smith to deepen my understanding of scalable energy storage systems.',
    notes: 'Accepted: Excellent use of quantified achievements (15% increase). Clearly connects professional background to a specific faculty member and research goal at the target institution. Focuses on actions taken rather than internal emotional states.',
  },
  {
    intendedMajor: 'engineering',
    outcome: 'rejected',
    text: 'According to the dictionary, engineering is the application of science and math to solve problems. Throughout human history, engineers have solved the world\'s biggest challenges. During this project, my mind was opened to the possibility of using different materials to create structures that are better. I showed great initiative in my second project in the lab and became a more curious and capable scientist. I hope I might possibly be somewhat qualified for your esteemed program.',
    notes: 'Rejected: Uses dictionary definition opener. Highly generic sweeping statements (\'Throughout human history\'). Uses unsupported self-adjectives (\'curious and capable\'). Apologetic, insecure tone (\'might possibly be somewhat qualified\') instead of confident professionalism.',
  },
];

function pseudoRandomEmbedding() {
  return Array.from({ length: 1024 }, () => Math.random());
}

export async function seedEssays() {
  await deleteAllExamples();
  for (const example of ESSAY_EXAMPLES) {
    await insertExample({ ...example, embedding: pseudoRandomEmbedding() });
  }
  logger.info('Seeded essay examples', { count: ESSAY_EXAMPLES.length });
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedEssays()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
