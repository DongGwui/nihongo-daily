import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { verifyTelegramLogin } from '@/lib/auth';
import { createSession, sessionCookieOptions } from '@/lib/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db';

export async function POST(request: NextRequest) {
  const data = await request.json();

  if (!verifyTelegramLogin(data)) {
    return NextResponse.json({ error: 'INVALID_AUTH', message: '인증 데이터가 유효하지 않습니다.' }, { status: 401 });
  }

  const telegramId = String(data.id);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { error: 'NOT_REGISTERED', message: 'Telegram 봇에서 /start를 먼저 실행해주세요.' },
      { status: 401 },
    );
  }

  const token = await createSession({
    id: user.id,
    telegramId: user.telegramId,
    jlptLevel: user.jlptLevel,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      jlptLevel: user.jlptLevel,
      streakCount: user.streakCount,
    },
  });

  response.cookies.set(sessionCookieOptions(token));

  return response;
}
