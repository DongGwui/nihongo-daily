import type { BotContext } from '../bot.js';
import { updateUserDailyTime } from '../../services/user.service.js';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function timeHandler(ctx: BotContext) {
  if (!ctx.session.userId) {
    await ctx.reply('먼저 /start 로 등록해주세요.');
    return;
  }

  const arg = ctx.message?.text?.split(' ')[1];

  if (!arg || !TIME_REGEX.test(arg)) {
    await ctx.reply(
      '⏰ 학습 시간을 HH:mm 형식으로 입력해주세요.\n\n' +
      '예: /time 08:00\n예: /time 21:30'
    );
    return;
  }

  await updateUserDailyTime(ctx.session.userId, arg);
  await ctx.reply(`✅ 매일 ${arg}에 학습 콘텐츠를 보내드릴게요!`);
}
