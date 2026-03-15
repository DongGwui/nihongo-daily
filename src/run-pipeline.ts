/**
 * NHK 크롤링 + Gemini 퀴즈 생성 수동 실행
 *
 * 홈서버: docker exec nihongo-app node dist/run-pipeline.js
 * 크롤링만: docker exec nihongo-app node dist/run-pipeline.js --crawl-only
 */
import { crawlAndSave, fetchArticleList } from './pipeline/crawlers/nhk-easy.js';
import { batchGenerateQuizzes } from './pipeline/generators/quiz-generator.js';
import { config } from './lib/config.js';
import type { JlptLevel } from './db/schema.js';

const crawlOnly = process.argv.includes('--crawl-only');

async function main() {
  console.log('=== NHK Easy News 크롤링 ===\n');

  const articles = await fetchArticleList();
  console.log(`최신 기사 ${articles.length}개 발견:`);
  for (const [i, a] of articles.slice(0, 5).entries()) {
    console.log(`  ${i + 1}. ${a.title.replace(/<[^>]*>/g, '')}`);
  }

  console.log('\nDB에 저장 중...');
  const saved = await crawlAndSave(3);
  console.log(`${saved}개 기사 저장 완료\n`);

  if (!crawlOnly && config.GEMINI_API_KEY) {
    console.log('=== Gemini 퀴즈 생성 ===\n');
    const generated = await batchGenerateQuizzes('N3', 2);
    console.log(`${generated}개 퀴즈 생성 완료`);
  } else if (!config.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY 미설정 → 퀴즈 생성 건너뜀');
  }

  console.log('\n완료!');
  process.exit(0);
}

main().catch((err) => {
  console.error('실패:', err);
  process.exit(1);
});
