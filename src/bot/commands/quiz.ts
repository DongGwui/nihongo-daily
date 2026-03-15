import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../bot.js';
import { getRandomQuizzes, getQuizById } from '../../services/quiz.service.js';
import { updateDailyQuizStats } from '../../services/daily.service.js';
import type { JlptLevel } from '../../db/schema.js';

export async function quizHandler(ctx: BotContext) {
  if (!ctx.session.userId || !ctx.session.jlptLevel) {
    await ctx.reply('먼저 /start 로 등록해주세요.');
    return;
  }

  const level = ctx.session.jlptLevel as JlptLevel;
  const quizList = await getRandomQuizzes(level);

  if (quizList.length === 0) {
    await ctx.reply('😢 아직 퀴즈가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  // composition 등 가상 퀴즈의 변환 데이터를 overrides에 저장
  const overrides: Record<number, { question: string; answer: string; type: string }> = {};
  for (const q of quizList) {
    if (q.type === 'composition') {
      overrides[q.id] = { question: q.question, answer: q.answer, type: q.type };
    }
  }

  ctx.session.activeQuiz = {
    quizIds: quizList.map(q => q.id),
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
    overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
  };

  await sendQuizMessage(ctx, quizList[0]);
}

export async function sendQuizMessage(ctx: BotContext, quiz: { id: number; question: string; options: unknown }) {
  const options = quiz.options as string[] | null;

  if (options && options.length > 0) {
    const keyboard = new InlineKeyboard();
    for (const [i, opt] of options.entries()) {
      const label = String.fromCharCode(65 + i); // A, B, C, D
      keyboard.text(`${label}) ${opt}`, `quiz_answer:${quiz.id}:${label}`);
      if (i % 2 === 1) keyboard.row();
    }

    await ctx.reply(quiz.question, { reply_markup: keyboard });
  } else {
    await ctx.reply(`${quiz.question}\n\n(답을 입력해주세요)`);
  }
}

export async function sendNextQuizOrSummary(ctx: BotContext) {
  const aq = ctx.session.activeQuiz;
  if (!aq) return;

  aq.currentIndex++;

  if (aq.currentIndex >= aq.quizIds.length) {
    const total = aq.quizIds.length;
    const correct = aq.correctCount;
    const elapsed = Math.round((Date.now() - aq.startedAt) / 1000);

    // 통계 기록
    if (ctx.session.userId) {
      await updateDailyQuizStats(ctx.session.userId, total, correct);
    }

    await ctx.reply(
      `🎉 퀴즈 완료!\n\n` +
      `✅ ${correct}/${total} 정답\n` +
      `⏱️ 소요 시간: ${elapsed}초\n\n` +
      `복습: /review\n통계: /stats`
    );

    ctx.session.activeQuiz = null;
    return;
  }

  const nextQuizId = aq.quizIds[aq.currentIndex];
  const nextQuiz = await getQuizById(nextQuizId);
  if (nextQuiz) {
    const override = aq.overrides?.[nextQuizId];
    const quizToSend = override
      ? { ...nextQuiz, question: override.question, answer: override.answer, type: override.type }
      : nextQuiz;
    await sendQuizMessage(ctx, quizToSend);
  }
}
