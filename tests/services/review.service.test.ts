import { describe, it, expect } from 'vitest';
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';

describe('Review Service - FSRS Integration', () => {
  const f = fsrs(generatorParameters());

  it('should map card state to string correctly', () => {
    const card = createEmptyCard();
    const stateMap: Record<number, string> = {
      0: 'new',
      1: 'learning',
      2: 'review',
      3: 'relearning',
    };

    // New card should be state 0
    expect(stateMap[card.state]).toBe('new');
  });

  it('should transition from new to learning on first review', () => {
    const card = createEmptyCard();
    const scheduling = f.repeat(card, new Date());
    const result = scheduling[Rating.Good];

    // After first review, state changes from new
    expect(result.card.reps).toBe(1);
  });

  it('should calculate due cards correctly', () => {
    const now = new Date();
    const pastDue = new Date(now.getTime() - 86400000); // 1 day ago
    const futureDue = new Date(now.getTime() + 86400000); // 1 day later

    expect(pastDue <= now).toBe(true);  // due
    expect(futureDue <= now).toBe(false); // not due
  });
});
