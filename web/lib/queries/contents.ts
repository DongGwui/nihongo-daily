import { eq, and, sql, ilike, or, desc } from 'drizzle-orm';
import { db } from '../db';
import { contents, vocabularies, quizzes, dailyLogs } from '../db';

export interface ContentItem {
  id: number;
  type: string;
  jlptLevel: string;
  title: string | null;
  bodyJa: string;
  bodyKo: string | null;
  source: string;
  studied: boolean;
}

export interface ContentSearchResult {
  items: ContentItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function searchContents(
  userId: number,
  params: { level?: string; type?: string; q?: string; page?: number; limit?: number },
): Promise<ContentSearchResult> {
  const { level, type, q, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (level) conditions.push(eq(contents.jlptLevel, level));
  if (type) conditions.push(eq(contents.type, type));
  if (q) {
    conditions.push(
      or(
        ilike(contents.bodyJa, `%${q}%`),
        ilike(contents.title, `%${q}%`),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)`.as('count') })
    .from(contents)
    .where(where);

  const total = countResult?.count ?? 0;

  const items = await db
    .select({
      id: contents.id,
      type: contents.type,
      jlptLevel: contents.jlptLevel,
      title: contents.title,
      bodyJa: contents.bodyJa,
      bodyKo: contents.bodyKo,
      source: contents.source,
    })
    .from(contents)
    .where(where)
    .orderBy(desc(contents.createdAt))
    .limit(limit)
    .offset(offset);

  // 학습 여부 확인
  const contentIds = items.map((i) => i.id);
  const studiedIds = new Set<number>();
  if (contentIds.length > 0) {
    const studied = await db
      .select({ contentId: dailyLogs.contentId })
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.userId, userId),
          sql`${dailyLogs.contentId} IN (${sql.join(contentIds.map(id => sql`${id}`), sql`, `)})`,
        ),
      );
    studied.forEach((s) => { if (s.contentId) studiedIds.add(s.contentId); });
  }

  return {
    items: items.map((item) => ({
      ...item,
      studied: studiedIds.has(item.id),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getContentDetail(contentId: number) {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);
  if (!content) return null;

  const contentQuizzes = await db.select().from(quizzes).where(eq(quizzes.contentId, contentId));
  const contentVocab = await db.select().from(vocabularies).where(eq(vocabularies.contentId, contentId));

  return { content, quizzes: contentQuizzes, vocabularies: contentVocab };
}
