import { Bot, session, type Context } from 'grammy';
import { type SessionData, createInitialSession } from './middleware/session.js';
import { authMiddleware } from './middleware/auth.js';
import { startHandler } from './commands/start.js';
import { levelHandler } from './commands/level.js';
import { timeHandler } from './commands/time.js';
import { quizHandler } from './commands/quiz.js';
import { reviewHandler } from './commands/review.js';
import { statsHandler } from './commands/stats.js';
import { hintHandler } from './commands/hint.js';
import { skipHandler } from './commands/skip.js';
import { explainHandler } from './commands/explain.js';
import { webHandler } from './commands/web.js';
import { textAnswerHandler } from './handlers/text-answer.js';
import { quizAnswerCallback } from './callbacks/quiz-answer.js';
import { reviewRatingCallback, reviewFlipCallback } from './callbacks/review-rating.js';
import { dailyActionCallback } from './callbacks/daily-action.js';
import { setLevelCallback } from './commands/start.js';

export type BotContext = Context & { session: SessionData };

export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  // 미들웨어
  bot.use(session({ initial: createInitialSession }));
  bot.use(authMiddleware);

  // 명령어
  bot.command('start', startHandler);
  bot.command('level', levelHandler);
  bot.command('time', timeHandler);
  bot.command('quiz', quizHandler);
  bot.command('review', reviewHandler);
  bot.command('stats', statsHandler);
  bot.command('hint', hintHandler);
  bot.command('skip', skipHandler);
  bot.command('explain', explainHandler);
  bot.command('web', webHandler);

  // 콜백 쿼리 (인라인 키보드)
  bot.callbackQuery(/^set_level:/, setLevelCallback);
  bot.callbackQuery(/^quiz_answer:/, quizAnswerCallback);
  bot.callbackQuery(/^review_rate:/, reviewRatingCallback);
  bot.callbackQuery(/^review_flip:/, reviewFlipCallback);
  bot.callbackQuery(/^daily_action:/, dailyActionCallback);

  // 서술형 퀴즈 텍스트 답변
  bot.on('message:text', textAnswerHandler);

  // 에러 핸들링
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
}
