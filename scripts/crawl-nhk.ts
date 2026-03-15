import 'dotenv/config';
import { crawlAndSave } from '../src/pipeline/crawlers/nhk-easy.js';

async function main() {
  const limit = parseInt(process.argv[2] ?? '5', 10);
  console.log(`Crawling NHK Easy News (limit: ${limit})...`);

  const saved = await crawlAndSave(limit);
  console.log(`Done! Saved ${saved} articles.`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Crawl failed:', err);
  process.exit(1);
});
