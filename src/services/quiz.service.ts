import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { quizzes, userQuizResults } from '../db/schema.js';
import type { JlptLevel } from '../db/schema.js';

export async function getQuizzesByContent(contentId: number) {
  return db
    .select()
    .from(quizzes)
    .where(eq(quizzes.contentId, contentId));
}

export async function getRandomQuizzes(level: JlptLevel, count = 4) {
  return db
    .select()
    .from(quizzes)
    .where(eq(quizzes.jlptLevel, level))
    .orderBy(sql`RANDOM()`)
    .limit(count);
}

export async function getQuizById(quizId: number) {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);
  return quiz ?? null;
}

export async function saveQuizResult(
  userId: number,
  quizId: number,
  userAnswer: string,
  isCorrect: boolean,
  timeSpentMs?: number
) {
  const [result] = await db
    .insert(userQuizResults)
    .values({ userId, quizId, userAnswer, isCorrect, timeSpentMs })
    .returning();
  return result;
}

export async function getUserQuizStats(userId: number, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const results = await db
    .select()
    .from(userQuizResults)
    .where(
      and(
        eq(userQuizResults.userId, userId),
        sql`${userQuizResults.answeredAt} >= ${since}`
      )
    );

  const total = results.length;
  const correct = results.filter(r => r.isCorrect).length;

  return { total, correct, accuracy: total > 0 ? correct / total : 0 };
}
