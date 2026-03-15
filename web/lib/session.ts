import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export interface SessionUser {
  id: number;
  telegramId: string;
  jlptLevel: string;
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-key-change-in-production');
const COOKIE_NAME = 'session';
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({
    sub: String(user.id),
    tid: user.telegramId,
    level: user.jlptLevel,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: Number(payload.sub),
      telegramId: payload.tid as string,
      jlptLevel: payload.level as string,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SEVEN_DAYS,
    path: '/',
  };
}
