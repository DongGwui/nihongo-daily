import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../bot.js';
import { updateUserLevel } from '../../services/user.service.js';
import type { JlptLevel } from '../../db/schema.js';

const VALID_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3'];

export async function levelHandler(ctx: BotContext) {
  if (!ctx.session.userId) {
    await ctx.reply('먼저 /start 로 등록해주세요.');
    return;
  }

  const arg = ctx.message?.text?.split(' ')[1]?.toUpperCase();

  if (arg && VALID_LEVELS.includes(arg as JlptLevel)) {
    await updateUserLevel(ctx.session.userId, arg as JlptLevel);
    ctx.session.jlptLevel = arg;
    await ctx.reply(`✅ 레벨이 ${arg}(으)로 변경되었습니다.`);
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const level of VALID_LEVELS) {
    keyboard.text(level, `set_level:${level}`);
  }

  await ctx.reply(
    `📊 현재 레벨: ${ctx.session.jlptLevel ?? 'N5'}\n\n변경할 레벨을 선택하세요:`,
    { reply_markup: keyboard }
  );
}
