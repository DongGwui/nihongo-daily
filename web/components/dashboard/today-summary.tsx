'use client';

interface TodaySummaryProps {
  todayCount: number;
  todayCorrect: number;
  todayTotal: number;
}

export function TodaySummary({ todayCount, todayCorrect, todayTotal }: TodaySummaryProps) {
  const accuracy = todayTotal > 0 ? Math.round((todayCorrect / todayTotal) * 100) : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-3">오늘의 학습</h3>
      {todayCount > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">풀이한 문제</span>
            <span className="text-xl font-bold">{todayTotal}문제</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">정답률</span>
            <span className={`text-xl font-bold ${accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {accuracy}%
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">아직 오늘 학습 기록이 없습니다. 봇에서 퀴즈를 풀어보세요!</p>
      )}
    </div>
  );
}
