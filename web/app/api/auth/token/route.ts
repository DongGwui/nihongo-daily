import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, users } from '@/lib/db';
import { createSession, sessionCookieOptions } from '@/lib/session';

const FIVE_MINUTES = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const uid = searchParams.get('uid');
  const tid = searchParams.get('tid');
  const ts = searchParams.get('ts');
  const token = searchParams.get('token');

  if (!uid || !tid || !ts || !token) {
    return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 });
  }

  // 5분 유효기간 확인
  const timestamp = parseInt(ts, 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > FIVE_MINUTES) {
    return new NextResponse(
      '<html><body style="background:#111;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif"><div style="text-align:center"><h2>링크가 만료되었습니다</h2><p>봇에서 /web 명령을 다시 실행해주세요.</p></div></body></html>',
      { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  // HMAC 검증 (봇과 동일한 방식)
  const botToken = process.env.BOT_TOKEN || '';
  const data = `${uid}:${tid}:${ts}`;
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');

  if (token !== expected) {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 });
  }

  // 유저 조회
  const [user] = await db.select().from(users).where(eq(users.id, parseInt(uid, 10))).limit(1);
  if (!user) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  // JWT 세션 생성
  const jwt = await createSession({
    id: user.id,
    telegramId: user.telegramId,
    jlptLevel: user.jlptLevel,
  });

  const cookie = sessionCookieOptions(jwt);
  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.cookies.set(cookie);

  return response;
}
