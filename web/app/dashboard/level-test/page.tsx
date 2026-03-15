'use client';

import { useState } from 'react';

interface Question {
  index: number;
  level: string;
  quizId: number;
  type: string;
  question: string;
  options: string[];
}

interface TestResult {
  recommendedLevel: string;
  scores: Record<string, number>;
  totalCorrect: number;
  totalQuestions: number;
}

type Phase = 'intro' | 'testing' | 'result';

const levelColors: Record<string, string> = {
  N5: 'text-emerald-400',
  N4: 'text-cyan-400',
  N3: 'text-indigo-400',
  N2: 'text-amber-400',
  N1: 'text-red-400',
};

export default function LevelTestPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const startTest = async () => {
    setLoading(true);
    const res = await fetch('/api/level-test/start', { method: 'POST' });
    const data = await res.json();
    setQuestions(data.questions);
    setCurrentIndex(0);
    setAnswers({});
    setPhase('testing');
    setLoading(false);
  };

  const selectAnswer = (answer: string) => {
    const q = questions[currentIndex];
    const newAnswers = { ...answers, [q.quizId]: answer };
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitTest(newAnswers);
    }
  };

  const submitTest = async (finalAnswers: Record<number, string>) => {
    setLoading(true);
    const res = await fetch('/api/level-test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions, answers: finalAnswers }),
    });
    const data = await res.json();
    setResult(data);
    setPhase('result');
    setLoading(false);
  };

  const applyLevel = async () => {
    if (!result) return;
    setLoading(true);
    await fetch('/api/level-test/submit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: result.recommendedLevel }),
    });
    alert(`레벨이 ${result.recommendedLevel}로 변경되었습니다!`);
    setLoading(false);
  };

  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto space-y-6 pt-12">
        <div className="text-center space-y-4">
          <div className="text-5xl">🎯</div>
          <h1 className="text-2xl font-bold">JLPT 레벨 테스트</h1>
          <p className="text-gray-400">
            25문항의 적응형 테스트로 당신의 JLPT 레벨을 확인하세요.
            N5부터 N1까지 각 레벨의 문제가 출제됩니다.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 text-sm text-gray-400">
          <div>📝 총 25문항 (레벨당 5문항)</div>
          <div>⏱ 시간 제한 없음</div>
          <div>📊 레벨별 정답률 70% 이상 → 해당 레벨 추천</div>
        </div>

        <button
          onClick={startTest}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {loading ? '문제 생성 중...' : '테스트 시작'}
        </button>
      </div>
    );
  }

  if (phase === 'testing' && questions.length > 0) {
    const q = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="max-w-lg mx-auto space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>{currentIndex + 1} / {questions.length}</span>
            <span className={levelColors[q.level]}>{q.level}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-lg font-medium mb-6">{q.question}</p>
          <div className="space-y-3">
            {q.options.map((option, i) => (
              <button
                key={i}
                onClick={() => selectAnswer(option)}
                className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-indigo-500"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="max-w-lg mx-auto space-y-6 pt-8">
        <div className="text-center space-y-2">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">테스트 결과</h1>
          <p className="text-gray-400">
            {result.totalQuestions}문항 중 {result.totalCorrect}문항 정답
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <div className="text-sm text-gray-400 mb-2">추천 레벨</div>
          <div className={`text-4xl font-bold ${levelColors[result.recommendedLevel]}`}>
            {result.recommendedLevel}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h3 className="font-medium">레벨별 정답률</h3>
          {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => {
            const score = result.scores[level] ?? 0;
            return (
              <div key={level} className="flex items-center gap-3">
                <span className={`w-8 text-sm font-medium ${levelColors[level]}`}>{level}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${score >= 70 ? 'bg-emerald-500' : 'bg-gray-600'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm text-gray-400">{score}%</span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={applyLevel}
            disabled={loading}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {result.recommendedLevel} 레벨 적용
          </button>
          <button
            onClick={() => { setPhase('intro'); setResult(null); }}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
          >
            다시 하기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
