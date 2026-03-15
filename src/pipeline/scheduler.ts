import cron from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { getUsersForTime, buildDailyMessage, recordDailyLog, resetInactiveStreaks } from '../services/daily.service.js';
import { formatDailyMessage } from '../bot/messages/daily.js';
import { crawlAndSave } from './crawlers/nhk-easy.js';
import { batchGenerateQuizzes } from './generators/quiz-generator.js';
import type { Bot } from 'grammy';
import type { BotContext } from '../bot/bot.js';
import type { JlptLevel } from '../db/schema.js';
import { config } from '../lib/config.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export function startScheduler(bot: Bot<BotContext>) {
  if (config.DAILY_CRON_ENABLED !== 'true') {
    console.log('Scheduler disabled');
    return;
  }

  // 매 1분마다 해당 시간의 사용자에게 데일리 콘텐츠 전송
  cron.schedule('* * * * *', async () => {
    try {
      const targetUsers = await getUsersForTime();
      if (targetUsers.length === 0) return;

      for (const user of targetUsers) {
        try {
          const result = await buildDailyMessage(user.id, user.jlptLevel as JlptLevel);
          if (!result) continue;

          const { text, keyboard } = formatDailyMessage({
            contentId: result.contentId,
            bodyJa: result.message,
            level: user.jlptLevel,
            vocab: [],
          });

          await bot.api.sendMessage(user.telegramId, text, {
            reply_markup: keyboard,
          });

          await recordDailyLog(user.id, result.contentId);
        } catch (err) {
          console.error(`Failed to send daily to user ${user.id}:`, err);
        }
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  });

  // 매일 새벽 3시: NHK Easy News 크롤링
  cron.schedule(config.NHK_CRAWL_CRON, async () => {
    console.log('[Scheduler] Starting NHK crawl...');
    try {
      const crawled = await crawlAndSave(5);
      console.log(`[Scheduler] Crawled ${crawled} NHK articles`);
    } catch (err) {
      console.error('[Scheduler] NHK crawl error:', err);
    }
  });

  // 매일 새벽 4시: 퀴즈 사전 생성
  cron.schedule(config.QUIZ_BATCH_CRON, async () => {
    console.log('[Scheduler] Starting quiz batch generation...');
    try {
      if (!config.GEMINI_API_KEY) {
        console.log('[Scheduler] Gemini API key not set, skipping quiz generation');
        return;
      }
      for (const level of ['N5', 'N4', 'N3'] as JlptLevel[]) {
        const generated = await batchGenerateQuizzes(level, 5);
        if (generated > 0) {
          console.log(`[Scheduler] Generated ${generated} quizzes for ${level}`);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Quiz generation error:', err);
    }
  });

  // 매일 자정: 스트릭 업데이트
  cron.schedule(config.STREAK_UPDATE_CRON, async () => {
    console.log('[Scheduler] Updating streaks...');
    try {
      const result = await resetInactiveStreaks();
      console.log('[Scheduler] Streak reset complete');
    } catch (err) {
      console.error('[Scheduler] Streak update error:', err);
    }
  });

  console.log('Scheduler started (4 cron jobs)');
}
