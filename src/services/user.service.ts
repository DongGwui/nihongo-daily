import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import type { JlptLevel } from '../db/schema.js';

export async function findUserByTelegramId(telegramId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);
  return user ?? null;
}

export async function createUser(telegramId: string, username?: string) {
  const [user] = await db
    .insert(users)
    .values({ telegramId, username })
    .returning();
  return user;
}

export async function updateUserLevel(userId: number, level: JlptLevel) {
  await db
    .update(users)
    .set({ jlptLevel: level, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserDailyTime(userId: number, time: string) {
  await db
    .update(users)
    .set({ dailyTime: time, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserTimezone(userId: number, timezone: string) {
  await db
    .update(users)
    .set({ timezone, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateStreak(userId: number, streak: number, date: string) {
  await db
    .update(users)
    .set({ streakCount: streak, lastStudyDate: date, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
