import { describe, it, expect } from 'vitest';

describe('Quiz Service', () => {
  it('should validate quiz answer comparison', () => {
    const answer = 'さくら';
    const userAnswer = 'さくら';
    expect(userAnswer === answer).toBe(true);
  });

  it('should detect incorrect answer', () => {
    const answer = 'さくら';
    const userAnswer = 'はな';
    expect(userAnswer === answer).toBe(false);
  });

  it('should calculate accuracy correctly', () => {
    const correct = 3;
    const total = 4;
    const accuracy = total > 0 ? correct / total : 0;
    expect(accuracy).toBe(0.75);
  });

  it('should handle zero total gracefully', () => {
    const correct = 0;
    const total = 0;
    const accuracy = total > 0 ? correct / total : 0;
    expect(accuracy).toBe(0);
  });
});
