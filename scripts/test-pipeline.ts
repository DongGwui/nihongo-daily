/**
 * NHK 크롤링 + Gemini 퀴즈 생성 테스트
 *
 * 로컬 DB 사용:
 *   npm run dev:db
 *   npx tsx scripts/test-pipeline.ts
 *
 * 홈서버 DB (SSH 터널):
 *   ssh -L 15432:localhost:5432 homeserver
 *   DB_HOST=localhost DB_PORT=15432 DB_USER=postgres DB_PASSWORD=<pw> DB_NAME=nihongo BOT_TOKEN=dummy npx tsx scripts/test-pipeline.ts
 *
 * 크롤링만 테스트 (Gemini 없이):
 *   npx tsx scripts/test-pipeline.ts --crawl-only
 */
import 'dotenv/config';
import { crawlAndSave, fetchArticleList } from '../src/pipeline/crawlers/nhk-easy.js';
import { batchGenerateQuizzes } from '../src/pipeline/generators/quiz-generator.js';
import { config } from '../src/lib/config.js';

const crawlOnly = process.argv.includes('--crawl-only');

async function main() {
  // 1. NHK 기사 목록 가져오기
  console.log('=== NHK Easy News 크롤링 테스트 ===\n');

  console.log('기사 목록 조회 중...');
  const articles = await fetchArticleList();
  console.log(`최신 기사 ${articles.length}개 발견:\n`);

  for (const [i, article] of articles.slice(0, 5).entries()) {
    const title = article.title.replace(/<[^>]*>/g, '');
    console.log(`  ${i + 1}. ${title}`);
  }

  // 2. DB에 저장
  console.log('\nDB에 저장 중...');
  const saved = await crawlAndSave(3);
  console.log(`${saved}개 기사 저장 완료\n`);

  // 3. Gemini 퀴즈 생성
  if (!crawlOnly && config.GEMINI_API_KEY) {
    console.log('=== Gemini 퀴즈 생성 테스트 ===\n');
    const generated = await batchGenerateQuizzes('N3', 2);
    console.log(`${generated}개 퀴즈 생성 완료`);
  } else if (!config.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY 미설정 → 퀴즈 생성 건너뜀');
  } else {
    console.log('--crawl-only → 퀴즈 생성 건너뜀');
  }

  console.log('\n완료!');
  process.exit(0);
}

main().catch((err) => {
  console.error('테스트 실패:', err);
  process.exit(1);
});
