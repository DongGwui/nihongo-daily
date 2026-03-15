import type { BotContext } from '../bot.js';
import { getQuizzesByContent } from '../../services/quiz.service.js';
import { generateAndSaveQuizzes } from '../../pipeline/generators/quiz-generator.js';
import { sendQuizMessage } from '../commands/quiz.js';
import { reviewHandler } from '../commands/review.js';

export async function dailyActionCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.session.userId) return;

  // daily_action:{action}:{contentId}
  const parts = data.split(':');
  const action = parts[1];
  const contentId = parseInt(parts[2], 10);

  await ctx.answerCallbackQuery();

  if (action === 'quiz') {
    let quizList = await getQuizzesByContent(contentId);

    // 퀴즈가 없으면 on-demand로 Gemini 생성 시도
    if (quizList.length === 0) {
      await ctx.reply('⏳ 퀴즈를 생성하고 있습니다...');
      const generated = await generateAndSaveQuizzes(contentId);
      if (generated > 0) {
        quizList = await getQuizzesByContent(contentId);
      }
    }

    if (quizList.length === 0) {
      await ctx.reply('😢 이 콘텐츠의 퀴즈를 생성할 수 없습니다.');
      return;
    }

    ctx.session.activeQuiz = {
      quizIds: quizList.map(q => q.id),
      currentIndex: 0,
      correctCount: 0,
      startedAt: Date.now(),
    };

    await sendQuizMessage(ctx, quizList[0]);
  } else if (action === 'review') {
    await reviewHandler(ctx);
  }
}
