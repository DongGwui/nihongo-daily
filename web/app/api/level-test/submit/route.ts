import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { quizzes, users, levelTestResults } from '@/lib/db';
import { calculateResult, type TestQuestion } from '@/lib/queries/level-test';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json();
  const { questions, answers } = body as {
    questions: TestQuestion[];
    answers: Record<number, string>;
  };

  // 정답 조회
  const quizIds = questions.map((q) => q.quizId);
  const correctAnswers: Record<number, string> = {};

  for (const qid of quizIds) {
    const [quiz] = await db.select({ answer: quizzes.answer }).from(quizzes).where(eq(quizzes.id, qid)).limit(1);
    if (quiz) correctAnswers[qid] = quiz.answer;
  }

  const result = calculateResult(questions, answers, correctAnswers);

  // level_test_results 테이블에 기록
  await db.insert(levelTestResults).values({
    userId: session.id,
    recommendedLevel: result.recommendedLevel,
    scores: result.scores,
    totalQuestions: result.totalQuestions,
    correctCount: result.totalCorrect,
  });

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { level } = await request.json();
  if (!['N5', 'N4', 'N3', 'N2', 'N1'].includes(level)) {
    return NextResponse.json({ error: 'INVALID_LEVEL' }, { status: 400 });
  }

  await db.update(users).set({ jlptLevel: level }).where(eq(users.id, session.id));

  return NextResponse.json({ success: true, level });
}
