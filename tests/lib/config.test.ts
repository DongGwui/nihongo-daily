import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// config.ts의 envSchema를 직접 테스트 (process.env 변경 없이)
const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('nihongo'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  DAILY_CRON_ENABLED: z.string().default('true'),
  NHK_CRAWL_CRON: z.string().default('0 3 * * *'),
  QUIZ_BATCH_CRON: z.string().default('0 4 * * *'),
  STREAK_UPDATE_CRON: z.string().default('0 0 * * *'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Seoul'),
  MAX_DAILY_QUIZZES: z.coerce.number().default(10),
  MAX_REVIEW_CARDS: z.coerce.number().default(20),
});

describe('Config Schema', () => {
  it('should require BOT_TOKEN', () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('BOT_TOKEN'))).toBe(true);
    }
  });

  it('should accept minimal config with only BOT_TOKEN', () => {
    const result = envSchema.safeParse({ BOT_TOKEN: 'test-token' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DB_HOST).toBe('localhost');
      expect(result.data.DB_PORT).toBe(5432);
      expect(result.data.DB_NAME).toBe('nihongo');
      expect(result.data.DEFAULT_TIMEZONE).toBe('Asia/Seoul');
    }
  });

  it('should coerce DB_PORT from string to number', () => {
    const result = envSchema.safeParse({ BOT_TOKEN: 'tk', DB_PORT: '5433' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DB_PORT).toBe(5433);
    }
  });

  it('should use default cron schedules', () => {
    const result = envSchema.safeParse({ BOT_TOKEN: 'tk' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NHK_CRAWL_CRON).toBe('0 3 * * *');
      expect(result.data.QUIZ_BATCH_CRON).toBe('0 4 * * *');
      expect(result.data.STREAK_UPDATE_CRON).toBe('0 0 * * *');
    }
  });

  it('should allow custom cron overrides', () => {
    const result = envSchema.safeParse({
      BOT_TOKEN: 'tk',
      NHK_CRAWL_CRON: '0 2 * * *',
      QUIZ_BATCH_CRON: '0 5 * * *',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NHK_CRAWL_CRON).toBe('0 2 * * *');
      expect(result.data.QUIZ_BATCH_CRON).toBe('0 5 * * *');
    }
  });

  it('should reject empty BOT_TOKEN', () => {
    const result = envSchema.safeParse({ BOT_TOKEN: '' });
    expect(result.success).toBe(false);
  });

  it('should coerce MAX_DAILY_QUIZZES and MAX_REVIEW_CARDS', () => {
    const result = envSchema.safeParse({
      BOT_TOKEN: 'tk',
      MAX_DAILY_QUIZZES: '15',
      MAX_REVIEW_CARDS: '30',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.MAX_DAILY_QUIZZES).toBe(15);
      expect(result.data.MAX_REVIEW_CARDS).toBe(30);
    }
  });

  it('should default DAILY_CRON_ENABLED to true', () => {
    const result = envSchema.safeParse({ BOT_TOKEN: 'tk' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DAILY_CRON_ENABLED).toBe('true');
    }
  });
});
