/**
 * NHK Easy News 크롤러 단독 테스트 (DB 불필요)
 * npx tsx scripts/test-nhk-crawl.ts
 */
import 'dotenv/config';
import { fetchFromNhk } from '../src/pipeline/crawlers/nhk-easy.js';

async function main() {
  console.log('=== NHK Easy News 크롤러 테스트 ===\n');

  const articles = await fetchFromNhk(3);
  console.log(`\n총 ${articles.length}개 기사 가져옴:\n`);

  for (const [i, a] of articles.entries()) {
    console.log(`--- ${i + 1}. ${a.title} ---`);
    console.log(`URL: ${a.sourceUrl}`);
    console.log(`\n[일본어]\n${a.bodyJa}`);
    console.log(`\n[후리가나]\n${a.bodyReading}`);
    console.log(`\n[한국어]\n${a.bodyKo}`);
    console.log();
  }
}

main().catch((err) => {
  console.error('실패:', err);
  process.exit(1);
});
