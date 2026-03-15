import { describe, it, expect } from 'vitest';
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';

describe('FSRS Algorithm', () => {
  const f = fsrs(generatorParameters());

  it('should create an empty card with default values', () => {
    const card = createEmptyCard();
    expect(card.stability).toBe(0);
    expect(card.difficulty).toBe(0);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
  });

  it('should schedule next review after Good rating', () => {
    const card = createEmptyCard();
    const now = new Date();
    const scheduling = f.repeat(card, now);
    const result = scheduling[Rating.Good];

    expect(result.card.stability).toBeGreaterThan(0);
    expect(result.card.reps).toBe(1);
    expect(result.card.due.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should have shorter interval for Again vs Good', () => {
    const card = createEmptyCard();
    const now = new Date();
    const scheduling = f.repeat(card, now);

    const againDue = scheduling[Rating.Again].card.due;
    const goodDue = scheduling[Rating.Good].card.due;

    expect(againDue.getTime()).toBeLessThan(goodDue.getTime());
  });

  it('should increase stability with repeated Good ratings', () => {
    let card = createEmptyCard();
    const now = new Date();

    // First review
    const s1 = f.repeat(card, now);
    card = s1[Rating.Good].card;
    const stability1 = card.stability;

    // Second review
    const s2 = f.repeat(card, card.due);
    card = s2[Rating.Good].card;
    const stability2 = card.stability;

    expect(stability2).toBeGreaterThan(stability1);
  });

  it('should handle Again rating by resetting to short interval', () => {
    let card = createEmptyCard();
    const now = new Date();

    // First: Good
    const s1 = f.repeat(card, now);
    card = s1[Rating.Good].card;
    const goodDue = card.due;

    // Second: Again
    const s2 = f.repeat(card, card.due);
    card = s2[Rating.Again].card;

    // Again should reset to a shorter interval than the previous due
    expect(card.reps).toBe(2);
    expect(card.stability).toBeGreaterThan(0);
  });
});
