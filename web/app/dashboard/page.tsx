import { eq, and, lte, sql } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getCalendarData } from '@/lib/queries/calendar';
import { db, dailyLogs, reviewCards } from '@/lib/db';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { CalendarHeatmap } from '@/components/dashboard/calendar-heatmap';
import { TodaySummary } from '@/components/dashboard/today-summary';
import { ReviewReminder } from '@/components/dashboard/review-reminder';
import dayjs from 'dayjs';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const calendar = await getCalendarData(session.id);

  // 오늘의 학습 데이터
  const today = dayjs().format('YYYY-MM-DD');
  const todayLogs = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, session.id), eq(dailyLogs.date, today)));

  const todayCount = todayLogs.length;
  const todayCorrect = todayLogs.reduce((sum, l) => sum + l.correctCount, 0);
  const todayTotal = todayLogs.reduce((sum, l) => sum + l.totalCount, 0);

  // 복습 예정 카드 수
  const [dueCount] = await db
    .select({ count: sql<number>`COUNT(*)`.as('count') })
    .from(reviewCards)
    .where(and(eq(reviewCards.userId, session.id), lte(reviewCards.dueDate, new Date())));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      <SummaryCards
        totalDays={calendar.summary.totalDays}
        currentStreak={calendar.summary.currentStreak}
        totalQuizzes={calendar.summary.totalQuizzes}
        avgAccuracy={calendar.summary.avgAccuracy}
      />

      <CalendarHeatmap data={calendar.data} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TodaySummary
          todayCount={todayCount}
          todayCorrect={todayCorrect}
          todayTotal={todayTotal}
        />
        <ReviewReminder dueCount={dueCount?.count ?? 0} />
      </div>
    </div>
  );
}
