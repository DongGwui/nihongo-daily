import 'dotenv/config';
import { importAllSentenceLevels } from '../src/pipeline/importers/sentences.js';

async function main() {
  console.log('Importing JLPT sentence data...');

  const results = await importAllSentenceLevels();

  console.log('\nImport complete:');
  for (const [level, count] of Object.entries(results)) {
    console.log(`  ${level}: ${count} sentences`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
