import { eq, and, sql, notInArray } from 'drizzle-orm';
import { db } from '../db';
import { quizzes, userQuizResults } from '../db';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
const QUESTIONS_PER_LEVEL = 5;

export interface TestQuestion {
  index: number;
  level: string;
  quizId: number;
  type: string;
  question: string;
  options: string[];
}

export async function generateLevelTest(userId: number): Promise<TestQuestion[]> {
  const questions: TestQuestion[] = [];
  let index = 1;

  for (const level of LEVELS) {
    // 사용자가 풀지 않은 4지선다 퀴즈 우선
    const answeredIds = await db
      .select({ quizId: userQuizResults.quizId })
      .from(userQuizResults)
      .where(eq(userQuizResults.userId, userId));

    const answeredSet = answeredIds.map((a) => a.quizId);

    let candidates = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.jlptLevel, level),
          sql`${quizzes.options} IS NOT NULL`,
          answeredSet.length > 0
            ? sql`${quizzes.id} NOT IN (${sql.join(answeredSet.map(id => sql`${id}`), sql`, `)})`
            : undefined,
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(QUESTIONS_PER_LEVEL);

    // 풀지 않은 문제가 부족하면 기존 문제도 포함
    if (candidates.length < QUESTIONS_PER_LEVEL) {
      const more = await db
        .select()
        .from(quizzes)
        .where(and(eq(quizzes.jlptLevel, level), sql`${quizzes.options} IS NOT NULL`))
        .orderBy(sql`RANDOM()`)
        .limit(QUESTIONS_PER_LEVEL);
      // 중복 제거
      const existingIds = new Set(candidates.map((c) => c.id));
      for (const q of more) {
        if (!existingIds.has(q.id) && candidates.length < QUESTIONS_PER_LEVEL) {
          candidates.push(q);
        }
      }
    }

    for (const q of candidates) {
      questions.push({
        index: index++,
        level,
        quizId: q.id,
        type: q.type,
        question: q.question,
        options: (q.options as string[]) || [],
      });
    }
  }

  return questions;
}

export function calculateResult(
  questions: TestQuestion[],
  answers: Record<number, string>,
  correctAnswers: Record<number, string>,
) {
  const scores: Record<string, { correct: number; total: number }> = {};

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!scores[q.level]) scores[q.level] = { correct: 0, total: 0 };
    scores[q.level].total++;
    if (answers[i] === correctAnswers[q.quizId]) {
      scores[q.level].correct++;
    }
  }

  // 정답률 70% 이상인 최고 레벨
  let recommendedLevel = 'N5';
  for (const level of LEVELS) {
    const s = scores[level];
    if (s && s.total > 0 && s.correct / s.total >= 0.7) {
      recommendedLevel = level;
    }
  }

  const totalCorrect = Object.values(scores).reduce((sum, s) => sum + s.correct, 0);
  const totalQuestions = Object.values(scores).reduce((sum, s) => sum + s.total, 0);

  return {
    recommendedLevel,
    scores: Object.fromEntries(
      Object.entries(scores).map(([level, s]) => [level, Math.round((s.correct / s.total) * 100)]),
    ),
    totalCorrect,
    totalQuestions,
  };
}
