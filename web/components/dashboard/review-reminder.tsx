'use client';

interface ReviewReminderProps {
  dueCount: number;
}

export function ReviewReminder({ dueCount }: ReviewReminderProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-3">복습 예정</h3>
      {dueCount > 0 ? (
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold text-indigo-400">{dueCount}</div>
          <div className="text-sm text-gray-400">
            <p>복습할 카드가 있습니다.</p>
            <p>봇에서 /review 명령으로 복습하세요.</p>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">복습할 카드가 없습니다. 잘하고 있어요!</p>
      )}
    </div>
  );
}
