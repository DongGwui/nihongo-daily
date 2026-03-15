import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema.js';
import { dbUrl } from '../lib/config.js';

const client = postgres(dbUrl);
export const db = drizzle(client, { schema });

export async function initDatabase() {
  console.log('Initializing database tables...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id VARCHAR(64) NOT NULL UNIQUE,
      username VARCHAR(128),
      jlpt_level VARCHAR(2) NOT NULL DEFAULT 'N5',
      daily_time VARCHAR(5) NOT NULL DEFAULT '08:00',
      timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Seoul',
      is_active BOOLEAN NOT NULL DEFAULT true,
      streak_count INTEGER NOT NULL DEFAULT 0,
      last_study_date DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS contents (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      jlpt_level VARCHAR(2) NOT NULL,
      title TEXT,
      body_ja TEXT NOT NULL,
      body_reading TEXT,
      body_ko TEXT,
      source VARCHAR(20) NOT NULL,
      source_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vocabularies (
      id SERIAL PRIMARY KEY,
      word VARCHAR(100) NOT NULL,
      reading VARCHAR(200) NOT NULL,
      meaning_ko TEXT NOT NULL,
      jlpt_level VARCHAR(2) NOT NULL,
      part_of_speech VARCHAR(30),
      content_id INTEGER REFERENCES contents(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quizzes (
      id SERIAL PRIMARY KEY,
      content_id INTEGER REFERENCES contents(id),
      type VARCHAR(20) NOT NULL,
      question TEXT NOT NULL,
      options JSONB,
      answer TEXT NOT NULL,
      explanation TEXT,
      jlpt_level VARCHAR(2) NOT NULL,
      difficulty INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_quiz_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
      user_answer TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL,
      time_spent_ms INTEGER,
      answered_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS review_cards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      card_type VARCHAR(20) NOT NULL,
      card_ref_id INTEGER NOT NULL,
      stability REAL NOT NULL DEFAULT 0,
      difficulty REAL NOT NULL DEFAULT 0,
      due_date TIMESTAMP NOT NULL,
      last_review TIMESTAMP,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      state VARCHAR(20) NOT NULL DEFAULT 'new',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date DATE NOT NULL,
      content_id INTEGER REFERENCES contents(id),
      quizzes_completed INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      study_minutes INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, date)
    )
  `);

  console.log('Database tables ready!');
}
