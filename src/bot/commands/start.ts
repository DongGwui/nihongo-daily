import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../bot.js';
import { findUserByTelegramId, createUser, updateUserLevel } from '../../services/user.service.js';
import type { JlptLevel } from '../../db/schema.js';

const LEVELS: { label: string; value: JlptLevel }[] = [
  { label: 'N5 입문', value: 'N5' },
  { label: 'N4 초급', value: 'N4' },
  { label: 'N3 중급', value: 'N3' },
];

export async function startHandler(ctx: BotContext) {
  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();
  const existing = await findUserByTelegramId(telegramId);

  if (existing) {
    await ctx.reply(
      `이미 등록되어 있습니다!\n\n` +
      `📊 현재 설정:\n` +
      `• 레벨: ${existing.jlptLevel}\n` +
      `• 학습 시간: ${existing.dailyTime}\n` +
      `• 연속 학습: ${existing.streakCount}일\n\n` +
      `레벨 변경: /level\n학습 시간 변경: /time`
    );
    return;
  }

  const user = await createUser(telegramId, ctx.from.username);
  ctx.session.userId = user.id;

  const keyboard = new InlineKeyboard();
  for (const level of LEVELS) {
    keyboard.text(level.label, `set_level:${level.value}`);
  }

  await ctx.reply(
    `안녕하세요! 일본어 데일리 학습 봇입니다 🎌\n\n` +
    `매일 레벨에 맞는 일본어 콘텐츠를 보내드립니다.\n` +
    `퀴즈와 복습으로 실력을 키워보세요!\n\n` +
    `현재 일본어 레벨을 선택해주세요:`,
    { reply_markup: keyboard }
  );
}

export async function setLevelCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.session.userId) return;

  const level = data.replace('set_level:', '') as JlptLevel;
  await updateUserLevel(ctx.session.userId, level);
  ctx.session.jlptLevel = level;

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `✅ ${level} 레벨로 설정했습니다!\n\n` +
    `매일 학습 콘텐츠를 받을 시간을 설정해주세요.\n` +
    `예: /time 08:00\n\n` +
    `(기본값: 매일 오전 08:00)`
  );
}
