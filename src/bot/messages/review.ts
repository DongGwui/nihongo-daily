import { db } from '../../db/client.js';
import { vocabularies, quizzes } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

interface ReviewCardData {
  id: number;
  cardType: string;
  cardRefId: number;
}

interface ReviewCardContent {
  front: string;
  back: string;
}

async function getCardContent(card: ReviewCardData): Promise<ReviewCardContent> {
  if (card.cardType === 'vocabulary') {
    // cardRefId는 quiz ID (오답 시 퀴즈 ID로 복습카드 생성)
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, card.cardRefId))
      .limit(1);

    if (quiz) {
      return {
        front: quiz.question,
        back: `정답: ${quiz.answer}${quiz.explanation ? `\n💡 ${quiz.explanation}` : ''}`,
      };
    }
  }

  return {
    front: `카드 #${card.id}`,
    back: `카드 #${card.id}`,
  };
}

export async function formatReviewCard(card: ReviewCardData, side: 'front' | 'back'): Promise<string> {
  const content = await getCardContent(card);

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
