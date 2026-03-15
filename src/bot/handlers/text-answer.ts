import type { BotContext } from '../bot.js';
import { getQuizById, saveQuizResult } from '../../services/quiz.service.js';
import { createReviewCard } from '../../services/review.service.js';
import { sendNextQuizOrSummary } from '../commands/quiz.js';

export async function textAnswerHandler(ctx: BotContext) {
  const aq = ctx.session.activeQuiz;
  if (!aq || !ctx.session.userId || !ctx.message?.text) return;

  const quizId = aq.quizIds[aq.currentIndex];
  const quiz = await getQuizById(quizId);
  if (!quiz) return;

  // 4지선다 퀴즈는 인라인 키보드로 처리
  if (quiz.options && (quiz.options as string[]).length > 0) return;

  const userAnswer = ctx.message.text.trim();
  const isCorrect = userAnswer === quiz.answer;

  const elapsed = Date.now() - aq.startedAt;
  await saveQuizResult(ctx.session.userId, quizId, userAnswer, isCorrect, elapsed);

  ctx.session.lastQuizId = quizId;

  if (isCorrect) {
    aq.correctCount++;
    await ctx.reply(
      `✅ 정답! 「${quiz.answer}」\n` +
      (quiz.explanation ? `\n💡 ${quiz.explanation}` : ''),
    );
  } else {
    await createReviewCard(ctx.session.userId, 'vocabulary', quizId);
    await ctx.reply(
      `❌ 오답! 정답은 「${quiz.answer}」\n` +
      `입력한 답: 「${userAnswer}」\n` +
      (quiz.explanation ? `\n💡 ${quiz.explanation}` : '') +
      `\n\n📝 복습 카드에 추가되었습니다.`,
    );
  }

  await sendNextQuizOrSummary(ctx);
}
