import 'dotenv/config';
import { z } from 'zod';

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
  DEFAULT_TIMEZONE: z.string().default('Asia/Seoul'),
  MAX_DAILY_QUIZZES: z.coerce.number().default(10),
  MAX_REVIEW_CARDS: z.coerce.number().default(20),
});

export const config = envSchema.parse(process.env);

export const dbUrl = `postgres://${config.DB_USER}:${config.DB_PASSWORD}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`;
