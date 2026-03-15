import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, dailyLogs, contents, vocabularies } from '../db/schema.js';
import { selectDailyContent } from './content.service.js';
import { getQuizzesByContent } from './quiz.service.js';
import type { JlptLevel } from '../db/schema.js';
import dayjs from 'dayjs';

export async function getUsersForTime(time: string) {
  return db
    .select()
    .from(users)
    .where(
      and(
        eq(users.dailyTime, time),
        eq(users.isActive, true)
      )
    );
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

export async function recordDailyLog(userId: number, contentId: number) {
  const today = dayjs().format('YYYY-MM-DD');

  await db
    .insert(dailyLogs)
    .values({ userId, date: today, contentId })
    .onConflictDoNothing();
}
