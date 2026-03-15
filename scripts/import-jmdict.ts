import 'dotenv/config';
import { importAllLevels } from '../src/pipeline/importers/jmdict.js';

async function main() {
  console.log('Importing JLPT vocabulary data...');

  const results = await importAllLevels();

  console.log('\nImport complete:');
  for (const [level, count] of Object.entries(results)) {
    console.log(`  ${level}: ${count} words`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
