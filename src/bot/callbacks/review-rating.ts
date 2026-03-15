import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../bot.js';
import { reviewCard, getDueCards } from '../../services/review.service.js';
import { formatReviewCard } from '../messages/review.js';
import type { Grade } from 'ts-fsrs';

const GRADE_LABELS: Record<string, string> = {
  '1': 'Again',
  '2': 'Hard',
  '3': 'Good',
  '4': 'Easy',
};

export async function reviewRatingCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.session.userId) return;

  // review_rate:{cardId}:{rating}
  const parts = data.split(':');
  const cardId = parseInt(parts[1], 10);
  const grade = parseInt(parts[2], 10) as Grade;

  await ctx.answerCallbackQuery();

  const result = await reviewCard(cardId, grade);
  if (!result) return;

  const ar = ctx.session.activeReview;
  if (!ar) return;

  ar.currentIndex++;

  try {
    if (ar.currentIndex >= ar.cardIds.length) {
      const elapsed = Math.round((Date.now() - ar.startedAt) / 1000);
      await ctx.editMessageText(
        `✨ 복습 완료! ${ar.cardIds.length}장\n` +
        `⏱️ 소요 시간: ${elapsed}초`
      );
      ctx.session.activeReview = null;
      return;
    }

    // 다음 카드
    const nextCardId = ar.cardIds[ar.currentIndex];
    const [nextCard] = await getDueCards(ctx.session.userId, 1);
    if (nextCard) {
      const msg = formatReviewCard(nextCard, 'front');
      const keyboard = new InlineKeyboard()
        .text('뒤집기 🔄', `review_flip:${nextCard.id}`);
      await ctx.editMessageText(msg, { reply_markup: keyboard });
    }
  } catch {
    // "message is not modified" 에러 무시
  }
}

export async function reviewFlipCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const cardId = parseInt(data.split(':')[1], 10);
  await ctx.answerCallbackQuery();

  try {
    const keyboard = new InlineKeyboard()
      .text('Again', `review_rate:${cardId}:1`)
      .text('Hard', `review_rate:${cardId}:2`)
      .text('Good', `review_rate:${cardId}:3`)
      .text('Easy', `review_rate:${cardId}:4`);

    await ctx.editMessageText(
      `카드를 얼마나 잘 기억하셨나요?`,
      { reply_markup: keyboard }
    );
  } catch {
    // "message is not modified" 에러 무시
  }
}
