import cron from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { getUsersForTime, buildDailyMessage, recordDailyLog } from '../services/daily.service.js';
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
    const now = dayjs().tz(config.DEFAULT_TIMEZONE);
    const currentTime = now.format('HH:mm');

    try {
      const targetUsers = await getUsersForTime(currentTime);
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

  // 매일 새벽 4시: NHK Easy News 크롤링 + Gemini 퀴즈 생성
  cron.schedule('0 4 * * *', async () => {
    console.log('[Scheduler] Starting daily content pipeline...');

    try {
      // NHK Easy News 크롤링 (최신 5개)
      const crawled = await crawlAndSave(5);
      console.log(`[Scheduler] Crawled ${crawled} NHK articles`);

      // 퀴즈가 없는 콘텐츠에 Gemini 퀴즈 생성
      if (config.GEMINI_API_KEY) {
        for (const level of ['N5', 'N4', 'N3'] as JlptLevel[]) {
          const generated = await batchGenerateQuizzes(level, 5);
          if (generated > 0) {
            console.log(`[Scheduler] Generated ${generated} quizzes for ${level}`);
          }
        }
      }
    } catch (err) {
      console.error('[Scheduler] Content pipeline error:', err);
    }
  });

  console.log('Scheduler started');
}
