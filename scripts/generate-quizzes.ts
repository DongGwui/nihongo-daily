import 'dotenv/config';
import { batchGenerateQuizzes } from '../src/pipeline/generators/quiz-generator.js';
import type { JlptLevel } from '../src/db/schema.js';

async function main() {
  const level = (process.argv[2]?.toUpperCase() ?? 'N3') as JlptLevel;
  const limit = parseInt(process.argv[3] ?? '10', 10);

  console.log(`Generating quizzes for ${level} (limit: ${limit} contents)...`);

  const total = await batchGenerateQuizzes(level, limit);
  console.log(`Done! Generated ${total} quizzes.`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Quiz generation failed:', err);
  process.exit(1);
});
