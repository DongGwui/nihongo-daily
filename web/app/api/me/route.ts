import { NextResponse } from 'next/server';
import { eq, and, lte, sql } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { users, reviewCards } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  if (!user) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  const [dueCount] = await db
    .select({ count: sql<number>`COUNT(*)`.as('count') })
    .from(reviewCards)
    .where(and(eq(reviewCards.userId, session.id), lte(reviewCards.dueDate, new Date())));

  return NextResponse.json({
    id: user.id,
    username: user.username,
    jlptLevel: user.jlptLevel,
    streakCount: user.streakCount,
    isActive: user.isActive,
    reviewDueCount: dueCount?.count ?? 0,
  });
}
