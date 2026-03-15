import { eq, gte, and, sql, desc } from 'drizzle-orm';
import { db } from '../db';
import { dailyLogs, users } from '../db';
import dayjs from 'dayjs';

export interface CalendarDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface CalendarData {
  data: CalendarDay[];
  summary: {
    totalDays: number;
    currentStreak: number;
    longestStreak: number;
    totalQuizzes: number;
    avgAccuracy: number;
  };
}

function countToLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

export async function getCalendarData(userId: number, months = 6): Promise<CalendarData> {
  const sinceDate = dayjs().subtract(months, 'month').format('YYYY-MM-DD');

  const logs = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), gte(dailyLogs.date, sinceDate)))
    .orderBy(dailyLogs.date);

  const [user] = await db
    .select({ streak: users.streakCount })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const data: CalendarDay[] = logs.map((log) => ({
    date: log.date,
    count: log.totalCount,
    level: countToLevel(log.totalCount),
  }));

  const totalDays = logs.filter((l) => l.totalCount > 0).length;
  const totalQuizzes = logs.reduce((sum, l) => sum + l.totalCount, 0);
  const totalCorrect = logs.reduce((sum, l) => sum + l.correctCount, 0);

  // longest streak 계산
  let longestStreak = 0;
  let currentRun = 0;
  const dateSet = new Set(logs.filter((l) => l.totalCount > 0).map((l) => l.date));
  const start = dayjs(sinceDate);
  const end = dayjs();
  for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
    if (dateSet.has(d.format('YYYY-MM-DD'))) {
      currentRun++;
      longestStreak = Math.max(longestStreak, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return {
    data,
    summary: {
      totalDays,
      currentStreak: user?.streak ?? 0,
      longestStreak,
      totalQuizzes,
      avgAccuracy: totalQuizzes > 0 ? Math.round((totalCorrect / totalQuizzes) * 100) : 0,
    },
  };
}
