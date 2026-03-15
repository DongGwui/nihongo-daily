import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generateLevelTest } from '@/lib/queries/level-test';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const questions = await generateLevelTest(session.id);

  return NextResponse.json({
    questions,
    totalQuestions: questions.length,
  });
}
