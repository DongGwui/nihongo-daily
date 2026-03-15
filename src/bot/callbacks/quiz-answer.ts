import type { BotContext } from '../bot.js';
import { getQuizById, saveQuizResult } from '../../services/quiz.service.js';
import { createReviewCard } from '../../services/review.service.js';
import { sendNextQuizOrSummary } from '../commands/quiz.js';

export async function quizAnswerCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.session.userId) return;

  // quiz_answer:{quizId}:{selectedOption}
  const parts = data.split(':');
  const quizId = parseInt(parts[1], 10);
  const selected = parts[2]; // A, B, C, D

  const quiz = await getQuizById(quizId);
  if (!quiz) return;

  await ctx.answerCallbackQuery();

  const options = quiz.options as string[] | null;
  const selectedIndex = selected.charCodeAt(0) - 65; // A=0, B=1, ...
  const userAnswer = options?.[selectedIndex] ?? selected;
  const isCorrect = userAnswer === quiz.answer;

  // 결과 저장
  const elapsed = ctx.session.activeQuiz
    ? Date.now() - ctx.session.activeQuiz.startedAt
    : undefined;
  await saveQuizResult(ctx.session.userId, quizId, userAnswer, isCorrect, elapsed);

  ctx.session.lastQuizId = quizId;

  if (isCorrect) {
    if (ctx.session.activeQuiz) ctx.session.activeQuiz.correctCount++;
    await ctx.editMessageText(
      `✅ 정답! 「${quiz.answer}」\n` +
      (quiz.explanation ? `\n💡 ${quiz.explanation}` : '')
    );
  } else {
    // 오답 → 복습 카드 자동 생성
    await createReviewCard(ctx.session.userId, 'vocabulary', quizId);
    await ctx.editMessageText(
      `❌ 오답! 정답은 「${quiz.answer}」\n` +
      (quiz.explanation ? `\n💡 ${quiz.explanation}` : '') +
      `\n\n📝 복습 카드에 추가되었습니다.`
    );
  }

  // 다음 퀴즈
  await sendNextQuizOrSummary(ctx);
}
