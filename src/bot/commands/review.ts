import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../bot.js';
import { getDueCards, getReviewStats } from '../../services/review.service.js';
import { formatReviewCard } from '../messages/review.js';

export async function reviewHandler(ctx: BotContext) {
  if (!ctx.session.userId) {
    await ctx.reply('먼저 /start 로 등록해주세요.');
    return;
  }

  const cards = await getDueCards(ctx.session.userId);

  if (cards.length === 0) {
    const stats = await getReviewStats(ctx.session.userId);
    await ctx.reply(
      `✨ 오늘 복습할 카드가 없습니다!\n\n` +
      `📚 전체 카드: ${stats.totalCount}장`
    );
    return;
  }

  ctx.session.activeReview = {
    cardIds: cards.map(c => c.id),
    currentIndex: 0,
    startedAt: Date.now(),
  };

  const card = cards[0];
  const msg = await formatReviewCard(card, 'front');

  const keyboard = new InlineKeyboard()
    .text('뒤집기 🔄', `review_flip:${card.id}`);

  await ctx.reply(msg, { reply_markup: keyboard });
}
