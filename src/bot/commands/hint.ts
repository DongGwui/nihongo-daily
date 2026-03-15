import type { BotContext } from '../bot.js';
import { getQuizById } from '../../services/quiz.service.js';

export async function hintHandler(ctx: BotContext) {
  const aq = ctx.session.activeQuiz;
  if (!aq) {
    await ctx.reply('진행 중인 퀴즈가 없습니다. /quiz 로 시작하세요.');
    return;
  }

  const quiz = await getQuizById(aq.quizIds[aq.currentIndex]);
  if (!quiz) return;

  // 힌트: 정답의 첫 글자 + 길이 정보
  const answer = quiz.answer;
  const hint = answer.charAt(0) + '○'.repeat(answer.length - 1);

  await ctx.reply(`💡 힌트: ${hint} (${answer.length}글자)`);
}
