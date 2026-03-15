# Changelog

All notable changes to nihongo-daily project will be documented in this file.

---

## [0.2.0] - 2026-03-15 - MVP Phase 1 Complete

### Added

#### Content Pipeline (Iteration 1)
- **NHK Easy Crawler** (`src/pipeline/crawlers/nhk-easy.ts`)
  - Fetches latest articles from NHK News Web Easy API
  - Extracts ruby characters (후리가나) using cheerio
  - Automatically classifies as N3 level
  - Saves to contents table with source tracking

- **Tatoeba Importer** (`src/pipeline/importers/tatoeba.ts`)
  - TSV/JSON format support for bilingual sentence pairs (ja-ko)
  - Automatic JLPT level classification based on vocabulary
  - Batch import capability for 15,000+ sentences
  - `scripts/import-tatoeba.ts` utility script

- **JMdict Importer** (`src/pipeline/importers/jmdict.ts`)
  - Imports standard Japanese-English dictionary data
  - Supports N5-N3 vocabulary levels
  - Populates vocabularies table with readings and Korean meanings
  - `scripts/import-jmdict.ts` utility script

- **Level Classifier** (`src/pipeline/classifiers/level-classifier.ts`)
  - Analyzes Japanese text and extracts tokens
  - Matches tokens against JLPT vocabulary database
  - Determines JLPT level (N5-N1) with confidence score
  - Used by crawlers and importers for automatic classification

- **Gemini Quiz Generator** (`src/pipeline/generators/quiz-generator.ts`)
  - Generates 4-type quizzes from content using Google Gemini API
  - Quiz types: reading (읽기), vocabulary (어휘), grammar (문법), translate (해석)
  - Deduplication: skips content with existing quizzes
  - Batch generation with level filtering
  - `scripts/generate-quizzes.ts` utility script

#### Static Data
- `data/jlpt-vocab-n5.json` (JLPT N5 vocabulary 800+ words)
- `data/jlpt-vocab-n4.json` (JLPT N4 vocabulary 1,500+ words)
- `data/jlpt-vocab-n3.json` (JLPT N3 vocabulary 3,700+ words)
- `data/jlpt-grammar-n5.json` (N5 grammar patterns)
- `data/jlpt-grammar-n4.json` (N4 grammar patterns)
- `data/jlpt-grammar-n3.json` (N3 grammar patterns)

#### Test Suite (Iteration 1)
- **FSRS Algorithm Tests** (`tests/lib/fsrs.test.ts`)
  - 5 assertions: empty card, scheduling, interval comparison, stability calculation
  - Validates spaced repetition scheduling correctness

- **Quiz Service Tests** (`tests/services/quiz.service.test.ts`)
  - 4 assertions: answer comparison, accuracy calculation, correctness validation
  - Ensures quiz grading logic works correctly

- **Review Service Tests** (`tests/services/review.service.test.ts`)
  - 3 assertions: state mapping, card state transitions, due card filtering
  - Validates FSRS integration with review card system

- **Daily Service Tests** (`tests/services/daily.service.test.ts`)
  - 5 assertions: time format validation, streak logic, daily log idempotency
  - Tests daily content selection and user engagement tracking

**Total**: 17 test assertions, 100% pass rate

### Changed

- **Architecture Improvements**
  - Enhanced error handling in scheduler (added try-catch wrapping)
  - Improved idempotency: `onConflictDoNothing` for daily_logs uniqueness
  - Added deduplication in NHK crawler to prevent duplicate articles

- **Session Management**
  - Extended SessionData to include `userId` and `jlptLevel` for auth state caching

### Infrastructure

- **Docker Compose Configuration**
  - Finalized `docker-compose.yml` with app, redis, networks
  - Added healthcheck for Redis container
  - Configured volume persistence for Redis data

---

## [0.1.0] - 2026-03-15 - Initial Setup & MVP Core

### Initial Release

#### Project Foundation
- TypeScript + Node.js 22 configuration
- Drizzle ORM setup with PostgreSQL
- Environment variable management (.env.example)
- Package.json with all dependencies

#### Database Schema (7 Tables)
- `users` — Telegram user accounts with JLPT level & learning time
- `contents` — Learning content (news, sentences, grammar, vocabulary)
- `vocabularies` — Japanese vocabulary with readings and Korean meanings
- `quizzes` — Question bank with 4+ question types
- `user_quiz_results` — Quiz answer history and scoring
- `review_cards` — FSRS spaced repetition card tracking
- `daily_logs` — Daily activity logs per user

#### Telegram Bot (grammY Framework)
- **Commands (9 total)**
  - `/start` — Onboarding with level selection
  - `/level` — View and change JLPT level
  - `/time` — Set daily study notification time
  - `/quiz` — Start quiz session
  - `/review` — Open FSRS review cards
  - `/stats` — View learning statistics
  - `/hint` — Get hint for current quiz
  - `/skip` — Skip current question
  - `/explain` — Get detailed explanation

- **Callbacks (3 patterns)**
  - `quiz_answer:` — Multiple-choice answer selection
  - `review_rate:` — FSRS rating (Again/Hard/Good/Easy)
  - `daily_action:` — Quick actions from daily message

- **Middleware**
  - Session management (active quiz/review tracking)
  - User authentication (registration check)
  - Error handling with try-catch

#### Services Layer (6 Services)
- **UserService** — User CRUD, level management, time settings
- **ContentService** — Content retrieval with level filtering
- **QuizService** — Quiz grading, result persistence, accuracy calculation
- **ReviewService** — FSRS card management, scheduling, due date calculation
- **StatsService** — Learning statistics aggregation, streak tracking
- **DailyService** — Daily content selection, push scheduling, activity logging

#### Content & Features
- **Message Formatting** (4 formatters)
  - Daily content messages with vocabulary and grammar
  - Quiz question presentation
  - Review card front/back display
  - Statistics text graphs

- **Scheduler** (node-cron)
  - Daily content push (per-user time + timezone matching)
  - Automatic daily log creation and streak updates

- **API Integration**
  - Gemini API client for quiz generation
  - Configuration management for all external services

#### Test Infrastructure
- Vitest test runner configured
- TypeScript test support (vitest + tsx)
- Basic assertion setup for future tests

#### Deployment
- Dockerfile for containerization
- docker-compose.yml for home server deployment
- Redis container for caching
- PostgreSQL connection to shared home server DB

---

## Version History Summary

```
v0.1.0  (2026-03-15)  Initial MVP: Bot + Services + DB (14/14 steps)
v0.2.0  (2026-03-15)  Iteration 1: Content Pipeline + Tests (76% → 93%)
```

## PDCA Progress

| Phase | Date | Status | Match Rate | Notes |
|-------|------|:------:|:-----------:|-------|
| Plan | 2026-03-15 | ✅ Complete | - | 11-section planning document |
| Design | 2026-03-15 | ✅ Complete | - | 11-section design document |
| Do | 2026-03-15 | ✅ Complete | - | 36 TS files, 4 scripts, 6 data files |
| Check v1 | 2026-03-15 | ⚠️ 76% | 76% | Content pipeline missing |
| Act (Iter 1) | 2026-03-15 | ✅ Complete | - | 19 files added, pipeline completed |
| Check v2 | 2026-03-15 | ✅ 93% | 93% | Threshold (90%) passed |

---

## Next Steps (Phase 2+)

- [ ] Additional scheduler crons (NHK crawl @ 03:00, quiz batch @ 04:00, streak update @ 00:00)
- [ ] NHK Korean translation auto-generation
- [ ] Web dashboard (Next.js) with calendar, charts, search
- [ ] LINE Bot platform integration
- [ ] N2-N1 content expansion
- [ ] AI-based sentence writing quiz with auto-grading
- [ ] Voice recognition for pronunciation practice
- [ ] Community features (study groups, leaderboards)
- [ ] Mobile app (React Native)
- [ ] Premium subscription model

---

## Technology Stack

- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript 5.3
- **Bot Framework**: grammY 1.x (Telegram)
- **ORM**: Drizzle 0.32
- **Database**: PostgreSQL 15+ (shared infrastructure)
- **Cache**: Redis 7 (dedicated instance)
- **AI**: Google Gemini API (Free tier)
- **Scheduler**: node-cron 3.x
- **Testing**: Vitest 2.x
- **Deployment**: Docker Compose
- **Validation**: Zod 3.x

---

## Maintenance Notes

- **Telegram Bot Token**: Required from @BotFather
- **Gemini API Key**: Required from Google AI Studio
- **Database**: Shares home server PostgreSQL (nihongo database)
- **Redis**: Dedicated instance (nihongo-redis)
- **Monitoring**: Grafana + Tailscale (existing infrastructure)
- **Backup**: Weekly database backups (home server admin responsibility)
