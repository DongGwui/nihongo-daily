import crypto from 'crypto';
import type { BotContext } from '../bot.js';
import { findUserByTelegramId } from '../../services/user.service.js';

const WEB_URL = process.env.WEB_URL || 'https://nihongo.dltmxm.link';

export async function webHandler(ctx: BotContext) {
  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();
  const user = await findUserByTelegramId(telegramId);

  if (!user) {
    await ctx.reply('먼저 /start로 등록해주세요.');
    return;
  }

  // 일회용 토큰 생성 (5분 유효)
  const timestamp = Math.floor(Date.now() / 1000);
  const data = `${user.id}:${telegramId}:${timestamp}`;
  const secret = crypto.createHash('sha256').update(process.env.BOT_TOKEN || '').digest();
  const token = crypto.createHmac('sha256', secret).update(data).digest('hex');

  const loginUrl = `${WEB_URL}/api/auth/token?uid=${user.id}&tid=${telegramId}&ts=${timestamp}&token=${token}`;

  await ctx.reply(
    `🌐 웹 대시보드 로그인\n\n아래 버튼을 눌러 로그인하세요.\n(5분간 유효합니다)`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: '📊 대시보드 열기', url: loginUrl }]],
      },
    },
  );
}
