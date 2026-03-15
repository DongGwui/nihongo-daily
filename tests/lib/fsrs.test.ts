import { describe, it, expect } from 'vitest';
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';
import { scheduleReview, getEmptyCardDefaults } from '../../src/lib/fsrs.js';

describe('FSRS Module', () => {
  describe('scheduleReview', () => {
    it('should return valid result for Good rating on new card', () => {
      const defaults = getEmptyCardDefaults();
      const result = scheduleReview(defaults, Rating.Good);

      expect(result.stability).toBeGreaterThan(0);
      expect(result.reps).toBe(1);
      expect(result.dueDate.getTime()).toBeGreaterThan(Date.now());
      expect(result.state).toBe('learning');
    });

    it('should return shorter interval for Again vs Good', () => {
      const defaults = getEmptyCardDefaults();
      const again = scheduleReview(defaults, Rating.Again);
      const good = scheduleReview(defaults, Rating.Good);

      expect(again.dueDate.getTime()).toBeLessThan(good.dueDate.getTime());
    });

    it('should map state correctly', () => {
      const defaults = getEmptyCardDefaults();
      const result = scheduleReview(defaults, Rating.Again);
      expect(['new', 'learning', 'review', 'relearning']).toContain(result.state);
    });

    it('should increase stability with repeated Good ratings (via ts-fsrs direct)', () => {
      // scheduleReview always uses new Date(), so we test via ts-fsrs directly
      // to simulate time-advanced reviews
      const f = fsrs(generatorParameters());
      let card = createEmptyCard();
      const now = new Date();

      const s1 = f.repeat(card, now);
      card = s1[Rating.Good].card;
      const stability1 = card.stability;

      const s2 = f.repeat(card, card.due);
      card = s2[Rating.Good].card;

      expect(card.stability).toBeGreaterThan(stability1);
    });
  });

  describe('getEmptyCardDefaults', () => {
    it('should return zeroed defaults', () => {
      const defaults = getEmptyCardDefaults();
      expect(defaults.stability).toBe(0);
      expect(defaults.difficulty).toBe(0);
      expect(defaults.reps).toBe(0);
      expect(defaults.lapses).toBe(0);
    });
  });

  describe('ts-fsrs direct (regression)', () => {
    const f = fsrs(generatorParameters());

    it('should create an empty card with default values', () => {
      const card = createEmptyCard();
      expect(card.stability).toBe(0);
      expect(card.difficulty).toBe(0);
    });

    it('should handle Again rating after Good', () => {
      let card = createEmptyCard();
      const now = new Date();

      const s1 = f.repeat(card, now);
      card = s1[Rating.Good].card;

      const s2 = f.repeat(card, card.due);
      card = s2[Rating.Again].card;

      expect(card.reps).toBe(2);
      expect(card.stability).toBeGreaterThan(0);
    });
  });
});
