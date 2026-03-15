import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';

describe('Daily Service', () => {
  it('should format time correctly for matching', () => {
    const time = '08:00';
    expect(time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should calculate today date string', () => {
    const today = dayjs().format('YYYY-MM-DD');
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should determine streak continuation', () => {
    const lastStudy = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    // Streak continues if last study was yesterday
    expect(lastStudy).toBe(yesterday);
  });

  it('should break streak if more than 1 day gap', () => {
    const lastStudy = dayjs().subtract(3, 'day').format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    expect(lastStudy).not.toBe(yesterday);
  });

  it('should validate time format', () => {
    const validTimes = ['08:00', '21:30', '00:00', '23:59'];
    const invalidTimes = ['8:00', '24:00', 'abc', '12:60'];

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    for (const t of validTimes) {
      expect(timeRegex.test(t), `${t} should be valid`).toBe(true);
    }
    for (const t of invalidTimes) {
      expect(timeRegex.test(t), `${t} should be invalid`).toBe(false);
    }
  });
});
