import { config } from './lib/config.js';
import { createBot } from './bot/bot.js';
import { startScheduler } from './pipeline/scheduler.js';

async function main() {
  console.log('Starting nihongo-daily bot...');

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
