/**
 * 콘텐츠 생성 + Gemini 퀴즈 생성 수동 실행
 *
 * 홈서버: docker exec nihongo-app node dist/run-pipeline.js
 */
import { crawlAndSave } from './pipeline/crawlers/nhk-easy.js';
import { batchGenerateQuizzes } from './pipeline/generators/quiz-generator.js';
import { config } from './lib/config.js';
import type { JlptLevel } from './db/schema.js';

const crawlOnly = process.argv.includes('--crawl-only');

async function main() {
  console.log('=== 일본어 학습 콘텐츠 생성 ===\n');

  if (!config.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }

  console.log('Gemini로 학습 콘텐츠 생성 중...');
  const saved = await crawlAndSave(5);
  console.log(`${saved}개 콘텐츠 저장 완료\n`);

  if (!crawlOnly) {
    console.log('=== Gemini 퀴즈 생성 ===\n');
    for (const level of ['N5', 'N4', 'N3'] as JlptLevel[]) {
      const generated = await batchGenerateQuizzes(level, 3);
      if (generated > 0) {
        console.log(`  ${level}: ${generated}개 퀴즈 생성`);
      }
    }
  }

  console.log('\n완료!');
  process.exit(0);
}

main().catch((err) => {
  console.error('실패:', err);
  process.exit(1);
});
