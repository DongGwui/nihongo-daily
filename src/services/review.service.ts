import { eq, and, lte, sql } from 'drizzle-orm';
import type { Grade } from 'ts-fsrs';
import { db } from '../db/client.js';
import { reviewCards, quizzes, contents, vocabularies } from '../db/schema.js';
import type { CardType } from '../db/schema.js';
import { scheduleReview } from '../lib/fsrs.js';

export async function getDueCards(userId: number, limit = 10) {
  return db
    .select()
    .from(reviewCards)
    .where(
      and(
        eq(reviewCards.userId, userId),
        lte(reviewCards.dueDate, new Date())
      )
    )
    .orderBy(reviewCards.dueDate)
    .limit(limit);
}

export async function reviewCard(cardId: number, grade: Grade) {
  const [card] = await db
    .select()
    .from(reviewCards)
    .where(eq(reviewCards.id, cardId))
    .limit(1);

  if (!card) return null;

  const result = scheduleReview(
    {
      stability: card.stability,
      difficulty: card.difficulty,
      reps: card.reps,
      lapses: card.lapses,
    },
    grade,
  );

  await db
    .update(reviewCards)
    .set({
      stability: result.stability,
      difficulty: result.difficulty,
      dueDate: result.dueDate,
      lastReview: new Date(),
      reps: result.reps,
      lapses: result.lapses,
      state: result.state,
    })
    .where(eq(reviewCards.id, cardId));

  return { nextDue: result.dueDate, interval: result.interval };
}

export async function createReviewCard(
  userId: number,
  cardType: CardType,
  cardRefId: number
) {
  const [card] = await db
    .insert(reviewCards)
    .values({
      userId,
      cardType,
      cardRefId,
      dueDate: new Date(),
    })
    .returning();
  return card;
}

export async function getCardById(cardId: number) {
  const [card] = await db
    .select()
    .from(reviewCards)
    .where(eq(reviewCards.id, cardId))
    .limit(1);
  return card ?? null;
}

export async function getCardContent(cardRefId: number, cardType: string) {
  if (cardType === 'vocabulary') {
    // 퀴즈 기반 어휘 카드
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, cardRefId))
      .limit(1);

    if (quiz) {
      return {
        front: quiz.question,
        back: `정답: ${quiz.answer}${quiz.explanation ? `\n💡 ${quiz.explanation}` : ''}`,
      };
    }
  }

  if (cardType === 'grammar' || cardType === 'sentence') {
    // 콘텐츠 기반 문법/문장 카드
    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, cardRefId))
      .limit(1);

    if (content) {
      const front = cardType === 'grammar'
        ? `📖 ${content.title ?? '문법'}\n${content.bodyJa}`
        : `📝 ${content.bodyJa}`;

      const back = [
        content.bodyReading ? `読み: ${content.bodyReading}` : null,
        content.bodyKo ? `뜻: ${content.bodyKo}` : null,
      ].filter(Boolean).join('\n') || content.bodyJa;

      return { front, back };
    }
  }

  return { front: `카드 #${cardRefId}`, back: `카드 #${cardRefId}` };
}

export async function getReviewStats(userId: number) {
  const due = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviewCards)
    .where(
      and(
        eq(reviewCards.userId, userId),
        lte(reviewCards.dueDate, new Date())
      )
    );

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviewCards)
    .where(eq(reviewCards.userId, userId));

  return {
    dueCount: Number(due[0]?.count ?? 0),
    totalCount: Number(total[0]?.count ?? 0),
  };
}
