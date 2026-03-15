import type { BotContext } from '../bot.js';
import { getWeeklyStats, formatStatsMessage } from '../../services/stats.service.js';

export async function statsHandler(ctx: BotContext) {
  if (!ctx.session.userId) {
    await ctx.reply('먼저 /start 로 등록해주세요.');
    return;
  }

  const stats = await getWeeklyStats(ctx.session.userId);
  await ctx.reply(formatStatsMessage(stats));
}
