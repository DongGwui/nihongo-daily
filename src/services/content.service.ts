import { eq, and, notInArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { contents, dailyLogs } from '../db/schema.js';
import type { JlptLevel, ContentType } from '../db/schema.js';

const CONTENT_ROTATION: ContentType[] = ['news', 'sentence', 'grammar', 'vocabulary'];

export async function selectDailyContent(userId: number, level: JlptLevel) {
  // 이미 본 콘텐츠 ID + 타입 수집
  const seen = await db
    .select({ contentId: dailyLogs.contentId })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, userId));

  const seenIds = seen.map(s => s.contentId).filter((id): id is number => id !== null);

  // 마지막으로 본 콘텐츠 타입 → 로테이션으로 다음 타입 결정
  const nextType = await getNextContentType(userId);

  // 1차: 미사용 콘텐츠 중 다음 타입 우선
  const baseWhere = seenIds.length > 0
    ? and(eq(contents.jlptLevel, level), notInArray(contents.id, seenIds))
    : eq(contents.jlptLevel, level);

  const [typed] = await db
    .select()
    .from(contents)
    .where(and(baseWhere, eq(contents.type, nextType)))
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (typed) return typed;

  // 2차: 타입 무관 미사용 콘텐츠
  const [any] = await db
    .select()
    .from(contents)
    .where(baseWhere)
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (any) return any;

  // 3차: 미사용 콘텐츠가 없으면 가장 오래전 사용한 콘텐츠
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

async function getNextContentType(userId: number): Promise<ContentType> {
  // 마지막으로 본 콘텐츠 타입 조회
  const [lastLog] = await db
    .select({ contentId: dailyLogs.contentId })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, userId))
    .orderBy(sql`${dailyLogs.createdAt} DESC`)
    .limit(1);

  if (!lastLog?.contentId) return CONTENT_ROTATION[0];

  const [lastContent] = await db
    .select({ type: contents.type })
    .from(contents)
    .where(eq(contents.id, lastLog.contentId))
    .limit(1);

  if (!lastContent) return CONTENT_ROTATION[0];

  const currentIdx = CONTENT_ROTATION.indexOf(lastContent.type as ContentType);
  return CONTENT_ROTATION[(currentIdx + 1) % CONTENT_ROTATION.length];
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
