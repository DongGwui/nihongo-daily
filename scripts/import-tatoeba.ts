import 'dotenv/config';
import { importFromTsv } from '../src/pipeline/importers/tatoeba.js';

async function main() {
  const jaFile = process.argv[2] ?? 'data/tatoeba-ja.tsv';
  const koFile = process.argv[3] ?? 'data/tatoeba-ko.tsv';
  const linksFile = process.argv[4] ?? 'data/tatoeba-links.tsv';
  const limit = parseInt(process.argv[5] ?? '500', 10);

  console.log(`Importing Tatoeba sentences (limit: ${limit})...`);
  console.log(`  JA: ${jaFile}`);
  console.log(`  KO: ${koFile}`);
  console.log(`  Links: ${linksFile}`);

  const saved = await importFromTsv(jaFile, koFile, linksFile, limit);
  console.log(`Done! Imported ${saved} sentence pairs.`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
