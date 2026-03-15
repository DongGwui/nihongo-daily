import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, dailyLogs, contents, vocabularies } from '../db/schema.js';
import { selectDailyContent } from './content.service.js';
import { getQuizzesByContent } from './quiz.service.js';
import type { JlptLevel } from '../db/schema.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export async function updateDailyQuizStats(userId: number, totalQuizzes: number, correctCount: number) {
  const today = dayjs().format('YYYY-MM-DD');

  // 오늘 로그가 이미 있으면 업데이트, 없으면 생성
  const [existing] = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, today)))
    .limit(1);

  if (existing) {
    await db
      .update(dailyLogs)
      .set({
        quizzesCompleted: existing.quizzesCompleted + 1,
        correctCount: existing.correctCount + correctCount,
        totalCount: existing.totalCount + totalQuizzes,
      })
      .where(eq(dailyLogs.id, existing.id));
  } else {
    await db
      .insert(dailyLogs)
      .values({
        userId,
        date: today,
        quizzesCompleted: 1,
        correctCount,
        totalCount: totalQuizzes,
      });
  }

  // 연속 학습 스트릭 업데이트
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user) {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const newStreak = user.lastStudyDate === yesterday
      ? user.streakCount + 1
      : user.lastStudyDate === today
        ? user.streakCount
        : 1;

    await db
      .update(users)
      .set({
        streakCount: newStreak,
        lastStudyDate: today,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

/**
 * 현재 시각 기준으로 데일리 전송 대상 사용자 조회
 * 각 사용자의 timezone에 맞춰 현재 시각을 계산하여 daily_time과 비교
 */
export async function getUsersForTime() {
  const activeUsers = await db
    .select()
    .from(users)
    .where(eq(users.isActive, true));

  return activeUsers.filter((user) => {
    const tz = user.timezone || 'Asia/Seoul';
    const userNow = dayjs().tz(tz);
    const currentTime = userNow.format('HH:mm');
    return user.dailyTime === currentTime;
  });
}

export async function buildDailyMessage(userId: number, level: JlptLevel) {
  const content = await selectDailyContent(userId, level);
  if (!content) return null;

  // 관련 어휘 조회
  const vocab = await db
    .select()
    .from(vocabularies)
    .where(eq(vocabularies.contentId, content.id))
    .limit(5);

  let msg = `📚 오늘의 일본어 (${level} 레벨)\n\n`;

  if (content.title) {
    msg += `📰 ${content.title}\n`;
  }
  msg += `「${content.bodyJa}」\n`;
  if (content.bodyKo) {
    msg += `(${content.bodyKo})\n`;
  }

  if (vocab.length > 0) {
    msg += `\n📝 오늘의 단어\n`;
    for (const v of vocab) {
      msg += `• ${v.word} (${v.reading}) - ${v.meaningKo}\n`;
    }
  }

  return { message: msg, contentId: content.id };
}

/**
 * 자정 스트릭 리셋: 어제 학습하지 않은 사용자의 streak을 0으로 초기화
 */
export async function resetInactiveStreaks() {
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  const result = await db
    .update(users)
    .set({ streakCount: 0, updatedAt: new Date() })
    .where(
      and(
        eq(users.isActive, true),
        sql`${users.lastStudyDate} IS NOT NULL AND ${users.lastStudyDate} < ${yesterday}`,
        sql`${users.streakCount} > 0`,
      ),
    );

  return result;
}

export async function recordDailyLog(userId: number, contentId: number) {
  const today = dayjs().format('YYYY-MM-DD');

  await db
    .insert(dailyLogs)
    .values({ userId, date: today, contentId })
    .onConflictDoNothing();
}
