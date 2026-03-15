import 'dotenv/config';
import { importAllGrammarLevels } from '../src/pipeline/importers/grammar.js';

async function main() {
  console.log('Importing JLPT grammar data...');

  const results = await importAllGrammarLevels();

  console.log('\nImport complete:');
  for (const [level, count] of Object.entries(results)) {
    console.log(`  ${level}: ${count} grammar patterns`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
