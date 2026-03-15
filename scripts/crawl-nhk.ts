import 'dotenv/config';
import { crawlAndSave } from '../src/pipeline/crawlers/nhk-easy.js';

async function main() {
  const limit = parseInt(process.argv[2] ?? '20', 10);
  console.log(`Crawling NHK Easy News (limit: ${limit})...`);
  console.log('기사 저장 후 자동으로 Gemini 퀴즈가 생성됩니다.\n');

  const saved = await crawlAndSave(limit);
  console.log(`\nDone! Saved ${saved} articles (with auto-generated quizzes).`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Crawl failed:', err);
  process.exit(1);
});
