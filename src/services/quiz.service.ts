import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { quizzes, userQuizResults } from '../db/schema.js';
import type { JlptLevel, QuizType } from '../db/schema.js';

const QUIZ_TYPES: QuizType[] = ['reading', 'vocabulary', 'grammar', 'translate', 'comprehension', 'composition'];

export async function getQuizzesByContent(contentId: number) {
  return db
    .select()
    .from(quizzes)
    .where(eq(quizzes.contentId, contentId));
}

export async function getRandomQuizzes(level: JlptLevel, count = 6) {
  const result = [];

  // 각 유형별 1개씩 출제
  for (const type of QUIZ_TYPES) {
    if (type === 'composition') {
      // composition은 translate 퀴즈를 뒤집어서 생성
      const [translateQuiz] = await db
        .select()
        .from(quizzes)
        .where(and(
          eq(quizzes.jlptLevel, level),
          eq(quizzes.type, 'translate'),
          sql`${quizzes.options} IS NULL`,
        ))
        .orderBy(sql`RANDOM()`)
        .limit(1);

      if (translateQuiz) {
        // question(일본어 문장) → answer, answer(한국어 번역) → question
        result.push({
          ...translateQuiz,
          id: translateQuiz.id,
          type: 'composition' as const,
          question: `다음을 일본어로 작성하세요:\n${translateQuiz.answer}`,
          answer: translateQuiz.question,
          options: null,
        });
      }
      continue;
    }

    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(and(eq(quizzes.jlptLevel, level), eq(quizzes.type, type)))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (quiz) result.push(quiz);
  }

  // 유형별 퀴즈가 부족하면 랜덤으로 채우기
  if (result.length < count) {
    const existingIds = result.map((q) => q.id);
    const more = await db
      .select()
      .from(quizzes)
      .where(and(
        eq(quizzes.jlptLevel, level),
        existingIds.length > 0
          ? sql`${quizzes.id} NOT IN (${sql.join(existingIds.map(id => sql`${id}`), sql`, `)})`
          : undefined,
      ))
      .orderBy(sql`RANDOM()`)
      .limit(count - result.length);
    result.push(...more);
  }

  return result;
}

export async function getQuizById(quizId: number) {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);
  return quiz ?? null;
}

export async function saveQuizResult(
  userId: number,
  quizId: number,
  userAnswer: string,
  isCorrect: boolean,
  timeSpentMs?: number
) {
  const [result] = await db
    .insert(userQuizResults)
    .values({ userId, quizId, userAnswer, isCorrect, timeSpentMs })
    .returning();
  return result;
}

export async function getUserQuizStats(userId: number, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const results = await db
    .select()
    .from(userQuizResults)
    .where(
      and(
        eq(userQuizResults.userId, userId),
        sql`${userQuizResults.answeredAt} >= ${since}`
      )
    );

  const total = results.length;
  const correct = results.filter(r => r.isCorrect).length;

  return { total, correct, accuracy: total > 0 ? correct / total : 0 };
}
