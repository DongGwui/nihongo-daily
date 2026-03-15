import { eq, and, notInArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { contents, dailyLogs } from '../db/schema.js';
import type { JlptLevel, ContentType } from '../db/schema.js';

const CONTENT_ROTATION: ContentType[] = ['news', 'sentence', 'grammar', 'vocabulary'];

export async function selectDailyContent(userId: number, level: JlptLevel) {
  // 이미 본 콘텐츠 ID 수집
  const seen = await db
    .select({ contentId: dailyLogs.contentId })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, userId));

  const seenIds = seen.map(s => s.contentId).filter((id): id is number => id !== null);

  // 미사용 콘텐츠 우선 선정
  const query = db
    .select()
    .from(contents)
    .where(
      seenIds.length > 0
        ? and(eq(contents.jlptLevel, level), notInArray(contents.id, seenIds))
        : eq(contents.jlptLevel, level)
    )
    .orderBy(sql`RANDOM()`)
    .limit(1);

  const [content] = await query;

  if (content) return content;

  // 미사용 콘텐츠가 없으면 가장 오래전 사용한 콘텐츠
  const [oldest] = await db
    .select({ contentId: dailyLogs.contentId })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, userId))
    .orderBy(dailyLogs.createdAt)
    .limit(1);

  if (oldest?.contentId) {
    const [reused] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, oldest.contentId))
      .limit(1);
    return reused ?? null;
  }

  return null;
}

export async function getContentById(id: number) {
  const [content] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, id))
    .limit(1);
  return content ?? null;
}

export async function getContentsByLevel(level: JlptLevel, limit = 10) {
  return db
    .select()
    .from(contents)
    .where(eq(contents.jlptLevel, level))
    .limit(limit);
}
