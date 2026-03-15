import { type NextFunction } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { users } from '../../db/schema.js';
import type { BotContext } from '../bot.js';

export async function authMiddleware(ctx: BotContext, next: NextFunction) {
  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  if (user) {
    ctx.session.userId = user.id;
    ctx.session.jlptLevel = user.jlptLevel;
  }

  await next();
}
