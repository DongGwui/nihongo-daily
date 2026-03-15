import { getCardContent } from '../../services/review.service.js';

interface ReviewCardData {
  id: number;
  cardType: string;
  cardRefId: number;
}

export async function formatReviewCard(card: ReviewCardData, side: 'front' | 'back'): Promise<string> {
  const content = await getCardContent(card.cardRefId, card.cardType);

  if (side === 'front') {
    return (
      `📝 복습 카드\n\n` +
      `${content.front}\n\n` +
      `[뒤집기를 눌러 정답을 확인하세요]`
    );
  }

  return (
    `📝 복습 카드\n\n` +
    `${content.back}\n\n` +
    `기억 정도를 평가해주세요.`
  );
}
