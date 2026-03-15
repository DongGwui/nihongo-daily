import { describe, it, expect } from 'vitest';
import { formatStreakMessage } from '../../../src/bot/messages/stats.js';

describe('formatStreakMessage', () => {
  it('should show start message for zero streak', () => {
    const msg = formatStreakMessage(0);
    expect(msg).toContain('아직');
    expect(msg).toContain('시작');
  });

  it('should show basic fire for 1-6 days', () => {
    const msg = formatStreakMessage(3);
    expect(msg).toContain('🔥');
    expect(msg).toContain('3일');
    expect(msg).toContain('계속');
  });

  it('should show praise for 7-29 days', () => {
    const msg = formatStreakMessage(14);
    expect(msg).toContain('🔥');
    expect(msg).toContain('14일');
    expect(msg).toContain('대단');
  });

  it('should show double fire for 30+ days', () => {
    const msg = formatStreakMessage(30);
    expect(msg).toContain('🔥🔥');
    expect(msg).toContain('30일');
    expect(msg).toContain('놀라운');
  });

  it('should handle boundary at 7 days', () => {
    const msg6 = formatStreakMessage(6);
    const msg7 = formatStreakMessage(7);
    expect(msg6).toContain('계속');
    expect(msg7).toContain('대단');
  });

  it('should handle boundary at 30 days', () => {
    const msg29 = formatStreakMessage(29);
    const msg30 = formatStreakMessage(30);
    expect(msg29).not.toContain('🔥🔥');
    expect(msg30).toContain('🔥🔥');
  });
});
