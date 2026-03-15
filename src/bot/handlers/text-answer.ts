import type { BotContext } from '../bot.js';
import { getQuizById, saveQuizResult } from '../../services/quiz.service.js';
import { createReviewCard } from '../../services/review.service.js';
import { sendNextQuizOrSummary } from '../commands/quiz.js';

// 공백, 구두점, 마침표 등을 제거하여 비교
function normalize(s: string): string {
  return s.replace(/[\s。、．，！？!?,.\-~～「」『』（）()・]/g, '').toLowerCase();
}

export async function textAnswerHandler(ctx: BotContext) {
  const aq = ctx.session.activeQuiz;
  if (!aq || !ctx.session.userId || !ctx.message?.text) return;

  const quizId = aq.quizIds[aq.currentIndex];
  const rawQuiz = await getQuizById(quizId);
  if (!rawQuiz) return;

  // overrides 적용 (composition 등 가상 퀴즈)
  const override = aq.overrides?.[quizId];
  const quiz = override
    ? { ...rawQuiz, question: override.question, answer: override.answer, type: override.type }
    : rawQuiz;

  // 4지선다 퀴즈는 인라인 키보드로 처리
  if (quiz.options && (quiz.options as string[]).length > 0) return;

  const userAnswer = ctx.message.text.trim();
  const isCorrect = normalize(userAnswer) === normalize(quiz.answer);

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
