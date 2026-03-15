import type { BotContext } from '../bot.js';
import { getQuizById } from '../../services/quiz.service.js';

export async function explainHandler(ctx: BotContext) {
  const quizId = ctx.session.lastQuizId;
  if (!quizId) {
    await ctx.reply('해설할 퀴즈가 없습니다. /quiz 로 퀴즈를 풀어보세요.');
    return;
  }

  const quiz = await getQuizById(quizId);
  if (!quiz) return;

  const explanation = quiz.explanation ?? '해설이 준비되지 않았습니다.';
  await ctx.reply(
    `📖 해설\n\n` +
    `Q: ${quiz.question}\n` +
    `A: ${quiz.answer}\n\n` +
    `${explanation}`
  );
}
