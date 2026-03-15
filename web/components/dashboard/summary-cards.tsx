interface SummaryCardsProps {
  totalDays: number;
  currentStreak: number;
  totalQuizzes: number;
  avgAccuracy: number;
}

export function SummaryCards({ totalDays, currentStreak, totalQuizzes, avgAccuracy }: SummaryCardsProps) {
  const cards = [
    { label: '총 학습일', value: `${totalDays}일`, icon: '📚' },
    { label: '연속 학습', value: `${currentStreak}일`, icon: '🔥' },
    { label: '총 퀴즈', value: `${totalQuizzes}문제`, icon: '📝' },
    { label: '평균 정답률', value: `${avgAccuracy}%`, icon: '✅' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <span>{card.icon}</span>
            <span>{card.label}</span>
          </div>
          <div className="text-2xl font-bold">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
