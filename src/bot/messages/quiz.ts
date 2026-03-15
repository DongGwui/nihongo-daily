export function formatQuizResult(correct: number, total: number, elapsed: number) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const emoji = accuracy >= 80 ? '🎉' : accuracy >= 50 ? '👍' : '💪';

  return (
    `${emoji} 퀴즈 결과\n\n` +
    `✅ ${correct}/${total} 정답 (${accuracy}%)\n` +
    `⏱️ 소요 시간: ${elapsed}초\n\n` +
    `복습: /review\n통계: /stats`
  );
}
