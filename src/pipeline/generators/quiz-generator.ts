import { generateQuizzes, type GeneratedQuiz } from '../../lib/gemini.js';
import { db } from '../../db/client.js';
import { quizzes, contents } from '../../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import type { JlptLevel } from '../../db/schema.js';

export async function generateAndSaveQuizzes(contentId: number): Promise<number> {
  const [content] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!content) return 0;

  // 이미 퀴즈가 있으면 스킵
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(quizzes)
    .where(eq(quizzes.contentId, contentId));

  if (Number(existing[0]?.count ?? 0) > 0) return 0;

  try {
    const generated = await generateQuizzes(content.bodyJa, content.jlptLevel);
    let saved = 0;

    for (const quiz of generated) {
      await db.insert(quizzes).values({
        contentId,
        type: quiz.type,
        question: quiz.question,
        options: quiz.options ?? null,
        answer: quiz.answer,
        explanation: quiz.explanation,
        jlptLevel: content.jlptLevel,
        difficulty: 1,
      });
      saved++;
    }

    return saved;
  } catch (err) {
    console.error(`Failed to generate quizzes for content ${contentId}:`, err);
    return 0;
  }
}

export async function batchGenerateQuizzes(level: JlptLevel, limit = 10): Promise<number> {
  // 퀴즈가 없는 콘텐츠 조회
  const contentsWithoutQuiz = await db
    .select({ id: contents.id })
    .from(contents)
    .where(eq(contents.jlptLevel, level))
    .limit(limit);

  let total = 0;
  for (const content of contentsWithoutQuiz) {
    total += await generateAndSaveQuizzes(content.id);
  }

  return total;
}
