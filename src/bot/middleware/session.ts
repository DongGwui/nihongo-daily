export interface SessionData {
  userId: number | null;
  jlptLevel: string | null;

  activeQuiz: {
    quizIds: number[];
    currentIndex: number;
    correctCount: number;
    startedAt: number;
  } | null;

  activeReview: {
    cardIds: number[];
    currentIndex: number;
    startedAt: number;
  } | null;

  lastQuizId: number | null;
  processing: boolean;
}

export function createInitialSession(): SessionData {
  return {
    userId: null,
    jlptLevel: null,
    activeQuiz: null,
    activeReview: null,
    lastQuizId: null,
    processing: false,
  };
}
