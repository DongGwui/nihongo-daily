import { eq, and, lte, sql } from 'drizzle-orm';
import { createEmptyCard, fsrs, generatorParameters, type Grade } from 'ts-fsrs';
import { db } from '../db/client.js';
import { reviewCards } from '../db/schema.js';
import type { CardType } from '../db/schema.js';

const f = fsrs(generatorParameters());

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

  const fsrsCard = createEmptyCard();
  fsrsCard.stability = card.stability;
  fsrsCard.difficulty = card.difficulty;
  fsrsCard.reps = card.reps;
  fsrsCard.lapses = card.lapses;

  const now = new Date();
  const scheduling = f.repeat(fsrsCard, now);
  const result = scheduling[grade];
  const updated = result.card;

  await db
    .update(reviewCards)
    .set({
      stability: updated.stability,
      difficulty: updated.difficulty,
      dueDate: updated.due,
      lastReview: now,
      reps: updated.reps,
      lapses: updated.lapses,
      state: updated.state === 0 ? 'new'
        : updated.state === 1 ? 'learning'
        : updated.state === 2 ? 'review'
        : 'relearning',
    })
    .where(eq(reviewCards.id, cardId));

  return { nextDue: updated.due, interval: result.log.elapsed_days };
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
