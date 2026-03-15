// stats 메시지 포맷은 stats.service.ts의 formatStatsMessage에서 처리
// 이 파일은 추가적인 통계 포맷 유틸리티를 위해 예약

export function formatStreakMessage(streak: number): string {
  if (streak === 0) return '아직 연속 학습 기록이 없습니다. 오늘부터 시작해볼까요?';
  if (streak < 7) return `🔥 ${streak}일 연속 학습 중! 계속 가보자!`;
  if (streak < 30) return `🔥 ${streak}일 연속! 대단해요!`;
  return `🔥🔥 ${streak}일 연속!! 놀라운 끈기입니다!`;
}
