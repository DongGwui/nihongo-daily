import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { dailyLogs, users } from '../db/schema.js';
import dayjs from 'dayjs';

export interface WeeklyStats {
  days: { date: string; quizzes: number; correct: number; total: number }[];
  streak: number;
  totalQuizzes: number;
  totalCorrect: number;
}

export async function getWeeklyStats(userId: number): Promise<WeeklyStats> {
  const since = dayjs().subtract(6, 'day').format('YYYY-MM-DD');

  const logs = await db
    .select()
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.userId, userId),
        gte(dailyLogs.date, since)
      )
    )
    .orderBy(dailyLogs.date);

  const [user] = await db
    .select({ streak: users.streakCount })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const log = logs.find(l => l.date === date);
    days.push({
      date,
      quizzes: log?.quizzesCompleted ?? 0,
      correct: log?.correctCount ?? 0,
      total: log?.totalCount ?? 0,
    });
  }

  const totalQuizzes = days.reduce((sum, d) => sum + d.quizzes, 0);
  const totalCorrect = days.reduce((sum, d) => sum + d.correct, 0);

  return {
    days,
    streak: user?.streak ?? 0,
    totalQuizzes,
    totalCorrect,
  };
}

export function formatStatsMessage(stats: WeeklyStats): string {
  const maxQuizzes = Math.max(...stats.days.map(d => d.quizzes), 1);
  const barWidth = 8;

  let msg = '📊 이번 주 학습 현황\n\n';

  for (const day of stats.days) {
    const dayLabel = dayjs(day.date).format('MM/DD');
    const filled = Math.round((day.quizzes / maxQuizzes) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    msg += `${dayLabel} ${bar} ${day.quizzes}문제\n`;
  }

  const totalTotal = stats.days.reduce((sum, d) => sum + d.total, 0);
  const accuracy = totalTotal > 0
    ? Math.round((stats.totalCorrect / totalTotal) * 100)
    : 0;

  msg += `\n🔥 연속 학습: ${stats.streak}일`;
  msg += `\n📝 이번 주 퀴즈: ${stats.totalQuizzes}문제`;
  msg += `\n✅ 정답률: ${accuracy}%`;

  return msg;
}
