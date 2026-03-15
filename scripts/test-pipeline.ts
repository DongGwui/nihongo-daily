/**
 * NHK 크롤링 + Gemini 퀴즈 생성 테스트
 *
 * 로컬 DB 사용:
 *   npm run dev:db
 *   npx tsx scripts/test-pipeline.ts
 *
 * NHK 크롤링만 테스트 (DB 저장 없이):
 *   npx tsx scripts/test-pipeline.ts --dry-run
 *
 * Gemini fallback만 테스트:
 *   npx tsx scripts/test-pipeline.ts --gemini-only
 *
 * 크롤링만 (퀴즈 생성 없이):
 *   npx tsx scripts/test-pipeline.ts --crawl-only
 */
import 'dotenv/config';
import { crawlAndSave, fetchArticleList, fetchFromNhk } from '../src/pipeline/crawlers/nhk-easy.js';
import { batchGenerateQuizzes } from '../src/pipeline/generators/quiz-generator.js';
import { config } from '../src/lib/config.js';

const crawlOnly = process.argv.includes('--crawl-only');
const dryRun = process.argv.includes('--dry-run');
const geminiOnly = process.argv.includes('--gemini-only');

async function main() {
  if (dryRun) {
    // NHK 크롤링만 테스트 (DB 저장 없이)
    console.log('=== NHK Easy News 크롤링 테스트 (dry-run) ===\n');
    try {
      const articles = await fetchFromNhk(3);
      console.log(`\n${articles.length}개 NHK 기사 가져옴:\n`);
      for (const [i, a] of articles.entries()) {
        console.log(`  ${i + 1}. ${a.title}`);
        console.log(`     본문: ${a.bodyJa.slice(0, 80)}...`);
        console.log(`     번역: ${a.bodyKo.slice(0, 80)}...`);
        console.log();
      }
    } catch (err) {
      console.error('NHK 크롤링 실패:', err);
    }
    process.exit(0);
  }

  // 1. 콘텐츠 가져오기 (NHK → Gemini fallback)
  console.log('=== 콘텐츠 파이프라인 테스트 ===\n');

  if (geminiOnly) {
    console.log('(--gemini-only: NHK 건너뛰고 Gemini만 사용)\n');
  }

  console.log('기사 목록 조회 중...');
  const articles = geminiOnly ? [] : await fetchArticleList();
  console.log(`${articles.length}개 콘텐츠 발견:\n`);

  for (const [i, article] of articles.slice(0, 5).entries()) {
    console.log(`  ${i + 1}. [${article.source}] ${article.title}`);
  }

  // 2. DB에 저장
  console.log('\nDB에 저장 중...');
  const saved = await crawlAndSave(3);
  console.log(`${saved}개 콘텐츠 저장 완료\n`);

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
