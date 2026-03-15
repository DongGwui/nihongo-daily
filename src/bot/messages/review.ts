interface ReviewCardData {
  id: number;
  cardType: string;
  cardRefId: number;
}

export function formatReviewCard(card: ReviewCardData, side: 'front' | 'back'): string {
  if (side === 'front') {
    return (
      `📝 복습 카드 (${card.cardType})\n\n` +
      `카드 #${card.id}\n` +
      `[뒤집기를 눌러 정답을 확인하세요]`
    );
  }

  return (
    `📝 복습 카드 (${card.cardType})\n\n` +
    `카드 #${card.id}\n` +
    `기억 정도를 평가해주세요.`
  );
}
