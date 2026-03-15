import { config } from './lib/config.js';
import { createBot } from './bot/bot.js';
import { startScheduler } from './pipeline/scheduler.js';
import { initDatabase } from './db/client.js';
import { seedDatabase } from './db/seed.js';

async function main() {
  console.log('Starting nihongo-daily bot...');

  // DB 테이블 자동 생성
  await initDatabase();

  // 초기 데이터 시딩 (비어있을 때만)
  await seedDatabase();

  const bot = createBot(config.BOT_TOKEN);

  // 스케줄러 시작
  startScheduler(bot);

  // 봇 시작 (long polling)
  await bot.start({
    onStart: () => console.log('Bot is running!'),
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
