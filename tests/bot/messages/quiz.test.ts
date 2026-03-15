import { describe, it, expect } from 'vitest';
import { formatQuizResult } from '../../../src/bot/messages/quiz.js';

describe('formatQuizResult', () => {
  it('should show celebration emoji for 80%+ accuracy', () => {
    const result = formatQuizResult(8, 10, 30);
    expect(result).toContain('🎉');
    expect(result).toContain('8/10');
    expect(result).toContain('80%');
  });

  it('should show thumbs up for 50-79% accuracy', () => {
    const result = formatQuizResult(5, 10, 45);
    expect(result).toContain('👍');
    expect(result).toContain('50%');
  });

  it('should show muscle emoji for below 50%', () => {
    const result = formatQuizResult(2, 10, 60);
    expect(result).toContain('💪');
    expect(result).toContain('20%');
  });

  it('should handle perfect score', () => {
    const result = formatQuizResult(10, 10, 20);
    expect(result).toContain('🎉');
    expect(result).toContain('100%');
  });

  it('should handle zero total gracefully', () => {
    const result = formatQuizResult(0, 0, 0);
    expect(result).toContain('0%');
    expect(result).toContain('0/0');
  });

  it('should include elapsed time', () => {
    const result = formatQuizResult(3, 5, 42);
    expect(result).toContain('42초');
  });

  it('should include navigation commands', () => {
    const result = formatQuizResult(1, 1, 10);
    expect(result).toContain('/review');
    expect(result).toContain('/stats');
  });
});
