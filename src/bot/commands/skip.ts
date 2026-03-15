import type { BotContext } from '../bot.js';
import { getQuizById } from '../../services/quiz.service.js';
import { sendNextQuizOrSummary } from './quiz.js';

export async function skipHandler(ctx: BotContext) {
  const aq = ctx.session.activeQuiz;
  if (!aq) {
    await ctx.reply('진행 중인 퀴즈가 없습니다. /quiz 로 시작하세요.');
    return;
  }

  const quiz = await getQuizById(aq.quizIds[aq.currentIndex]);
  if (quiz) {
    await ctx.reply(`⏭️ 건너뛰기! 정답은 「${quiz.answer}」입니다.`);
  }

  await sendNextQuizOrSummary(ctx);
}
