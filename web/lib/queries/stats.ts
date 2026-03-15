import { eq, gte, and, sql, desc } from 'drizzle-orm';
import { db } from '../db';
import { userQuizResults, quizzes, dailyLogs, contents, users } from '../db';
import dayjs from 'dayjs';

export interface StatsData {
  accuracy: {
    labels: string[];
    correct: number[];
    total: number[];
  };
  quizTypes: Record<string, { correct: number; total: number }>;
  levelDistribution: Record<string, number>;
  streakHistory: {
    current: number;
    longest: number;
    monthlyStudyDays: number[];
  };
}

function getPeriodDate(period: string): string {
  if (period === 'week') return dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  if (period === 'month') return dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  return '2020-01-01'; // all
}

export async function getStatsData(userId: number, period = 'week'): Promise<StatsData> {
  const sinceDate = getPeriodDate(period);
  const sinceTs = new Date(sinceDate);

  // 유저 스트릭 데이터
  const [userData] = await db
    .select({ streakCount: users.streakCount })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // 정답률 추이 (일별)
  const dailyAccuracy = await db
    .select({
      date: sql<string>`DATE(${userQuizResults.answeredAt})`.as('date'),
      correct: sql<number>`SUM(CASE WHEN ${userQuizResults.isCorrect} THEN 1 ELSE 0 END)`.as('correct'),
      total: sql<number>`COUNT(*)`.as('total'),
    })
    .from(userQuizResults)
    .where(and(eq(userQuizResults.userId, userId), gte(userQuizResults.answeredAt, sinceTs)))
    .groupBy(sql`DATE(${userQuizResults.answeredAt})`)
    .orderBy(sql`DATE(${userQuizResults.answeredAt})`);

  // 퀴즈 유형별 성과
  const typeStats = await db
    .select({
      type: quizzes.type,
      correct: sql<number>`SUM(CASE WHEN ${userQuizResults.isCorrect} THEN 1 ELSE 0 END)`.as('correct'),
      total: sql<number>`COUNT(*)`.as('total'),
    })
    .from(userQuizResults)
    .innerJoin(quizzes, eq(userQuizResults.quizId, quizzes.id))
    .where(and(eq(userQuizResults.userId, userId), gte(userQuizResults.answeredAt, sinceTs)))
    .groupBy(quizzes.type);

  // JLPT 레벨별 분포
  const levelStats = await db
    .select({
      level: contents.jlptLevel,
      count: sql<number>`COUNT(DISTINCT ${dailyLogs.contentId})`.as('count'),
    })
    .from(dailyLogs)
    .innerJoin(contents, eq(dailyLogs.contentId, contents.id))
    .where(and(eq(dailyLogs.userId, userId), gte(dailyLogs.date, sinceDate)))
    .groupBy(contents.jlptLevel);

  // 월별 학습일 수 (최근 3개월)
  const monthlyDays: number[] = [];
  for (let i = 2; i >= 0; i--) {
    const monthStart = dayjs().subtract(i, 'month').startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs().subtract(i, 'month').endOf('month').format('YYYY-MM-DD');
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)`.as('count') })
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.userId, userId),
          gte(dailyLogs.date, monthStart),
          sql`${dailyLogs.date} <= ${monthEnd}`,
        ),
      );
    monthlyDays.push(result?.count ?? 0);
  }

  return {
    accuracy: {
      labels: dailyAccuracy.map((d) => dayjs(d.date).format('MM/DD')),
      correct: dailyAccuracy.map((d) => d.correct),
      total: dailyAccuracy.map((d) => d.total),
    },
    quizTypes: Object.fromEntries(typeStats.map((t) => [t.type, { correct: t.correct, total: t.total }])),
    levelDistribution: Object.fromEntries(levelStats.map((l) => [l.level, l.count])),
    streakHistory: {
      current: userData?.streakCount ?? 0,
      longest: userData?.streakCount ?? 0, // longest streak은 별도 필드가 없으므로 현재 값 사용
      monthlyStudyDays: monthlyDays,
    },
  };
}
