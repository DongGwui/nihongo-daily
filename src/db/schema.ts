import {
  pgTable, serial, text, integer, boolean, timestamp,
  varchar, jsonb, real, date, uniqueIndex, index,
} from 'drizzle-orm/pg-core';

// ====== ENUMS (타입 정의) ======

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type ContentType = 'news' | 'sentence' | 'grammar' | 'vocabulary';
export type ContentSource = 'nhk_easy' | 'tatoeba' | 'jmdict' | 'generated';
export type QuizType = 'reading' | 'vocabulary' | 'grammar' | 'translate' | 'comprehension' | 'composition';
export type CardType = 'vocabulary' | 'grammar' | 'sentence';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

// ====== TABLES ======

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: varchar('telegram_id', { length: 64 }).notNull().unique(),
  username: varchar('username', { length: 128 }),
  jlptLevel: varchar('jlpt_level', { length: 2 }).notNull().default('N5'),
  dailyTime: varchar('daily_time', { length: 5 }).notNull().default('08:00'),
  timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Seoul'),
  isActive: boolean('is_active').notNull().default(true),
  streakCount: integer('streak_count').notNull().default(0),
  lastStudyDate: date('last_study_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_users_telegram_id').on(table.telegramId),
]);

export const contents = pgTable('contents', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 20 }).notNull(),
  jlptLevel: varchar('jlpt_level', { length: 2 }).notNull(),
  title: text('title'),
  bodyJa: text('body_ja').notNull(),
  bodyReading: text('body_reading'),
  bodyKo: text('body_ko'),
  source: varchar('source', { length: 20 }).notNull(),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_contents_level_type').on(table.jlptLevel, table.type),
]);

export const vocabularies = pgTable('vocabularies', {
  id: serial('id').primaryKey(),
  word: varchar('word', { length: 100 }).notNull(),
  reading: varchar('reading', { length: 200 }).notNull(),
  meaningKo: text('meaning_ko').notNull(),
  jlptLevel: varchar('jlpt_level', { length: 2 }).notNull(),
  partOfSpeech: varchar('part_of_speech', { length: 30 }),
  contentId: integer('content_id').references(() => contents.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_vocab_level').on(table.jlptLevel),
  index('idx_vocab_word').on(table.word),
]);

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').references(() => contents.id),
  type: varchar('type', { length: 20 }).notNull(),
  question: text('question').notNull(),
  options: jsonb('options'),
  answer: text('answer').notNull(),
  explanation: text('explanation'),
  jlptLevel: varchar('jlpt_level', { length: 2 }).notNull(),
  difficulty: integer('difficulty').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_quizzes_level_type').on(table.jlptLevel, table.type),
]);

export const userQuizResults = pgTable('user_quiz_results', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id),
  userAnswer: text('user_answer').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  timeSpentMs: integer('time_spent_ms'),
  answeredAt: timestamp('answered_at').notNull().defaultNow(),
}, (table) => [
  index('idx_results_user').on(table.userId),
  index('idx_results_user_date').on(table.userId, table.answeredAt),
]);

export const reviewCards = pgTable('review_cards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  cardType: varchar('card_type', { length: 20 }).notNull(),
  cardRefId: integer('card_ref_id').notNull(),
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  dueDate: timestamp('due_date').notNull(),
  lastReview: timestamp('last_review'),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  state: varchar('state', { length: 20 }).notNull().default('new'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_review_user_due').on(table.userId, table.dueDate),
  index('idx_review_user_state').on(table.userId, table.state),
]);

export const dailyLogs = pgTable('daily_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  date: date('date').notNull(),
  contentId: integer('content_id').references(() => contents.id),
  quizzesCompleted: integer('quizzes_completed').notNull().default(0),
  correctCount: integer('correct_count').notNull().default(0),
  totalCount: integer('total_count').notNull().default(0),
  studyMinutes: integer('study_minutes').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_daily_user_date').on(table.userId, table.date),
]);
