# nihongo-daily 설계서 (Design Document)

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | nihongo-daily (일본어 데일리 학습 봇) |
| Plan 참조 | `docs/01-plan/features/nihongo-daily.plan.md` |
| 작성일 | 2026-03-15 |
| MVP 범위 | Telegram 봇 집중 (3-4주) |
| 인프라 | 홈서버 (Intel N150, Ubuntu, Docker) |
| 도메인 | `nihongo.dltmxm.link` |

### 1.1 MVP 설계 범위

- Telegram 봇: 온보딩, 데일리 푸시, 퀴즈, 복습, 통계
- 콘텐츠 파이프라인: NHK Easy 크롤러, Tatoeba 임포트, Gemini 퀴즈 생성
- FSRS 복습 시스템
- N5-N3 레벨 지원

### 1.2 설계 제외 범위

- 웹 대시보드 (Phase 2)
- LINE/KakaoTalk 봇 (Phase 2+)
- N2-N1 콘텐츠 (Phase 2)
- AI 작문/요약 퀴즈 채점 (Phase 2)

---

## 2. 프로젝트 구조

```
nihongo-daily/
├── package.json
├── tsconfig.json
├── .env                          # 환경변수 (BOT_TOKEN, DB_URL, GEMINI_KEY 등)
├── .env.example
├── docker-compose.yml            # 홈서버 배포용 Docker Compose
├── Dockerfile
├── drizzle.config.ts             # Drizzle ORM 설정
│
├── src/
│   ├── index.ts                  # 앱 엔트리포인트 (봇 + 스케줄러 시작)
│   │
│   ├── bot/                      # Telegram 봇 계층
│   │   ├── bot.ts                # grammY 봇 인스턴스 생성 + 미들웨어 등록
│   │   ├── commands/             # 명령어 핸들러
│   │   │   ├── start.ts          # /start — 온보딩 플로우
│   │   │   ├── level.ts          # /level — 레벨 확인/변경
│   │   │   ├── time.ts           # /time — 학습 시간 설정
│   │   │   ├── quiz.ts           # /quiz — 퀴즈 시작 (서브커맨드 라우팅)
│   │   │   ├── review.ts         # /review — 복습 카드
│   │   │   ├── stats.ts          # /stats — 학습 통계
│   │   │   ├── hint.ts           # /hint — 퀴즈 힌트
│   │   │   ├── skip.ts           # /skip — 퀴즈 건너뛰기
│   │   │   └── explain.ts        # /explain — 상세 해설
│   │   ├── callbacks/            # 인라인 키보드 콜백 핸들러
│   │   │   ├── quiz-answer.ts    # 퀴즈 정답 선택 콜백
│   │   │   ├── review-rating.ts  # 복습 카드 평가 (Again/Hard/Good/Easy)
│   │   │   └── daily-action.ts   # 데일리 메시지 버튼 (퀴즈풀기/복습하기)
│   │   ├── middleware/           # 봇 미들웨어
│   │   │   ├── auth.ts           # 사용자 인증/등록 확인
│   │   │   └── session.ts        # 세션 관리 (퀴즈 진행 상태 등)
│   │   └── messages/             # 메시지 포매터
│   │       ├── daily.ts          # 데일리 콘텐츠 메시지 구성
│   │       ├── quiz.ts           # 퀴즈 메시지 구성
│   │       ├── review.ts         # 복습 카드 메시지 구성
│   │       └── stats.ts          # 통계 텍스트 그래프 구성
│   │
│   ├── services/                 # 비즈니스 로직 계층
│   │   ├── user.service.ts       # 사용자 CRUD, 레벨 관리
│   │   ├── content.service.ts    # 콘텐츠 조회, 레벨 필터링
│   │   ├── quiz.service.ts       # 퀴즈 조회, 정답 채점, 결과 저장
│   │   ├── review.service.ts     # FSRS 복습 로직
│   │   ├── stats.service.ts      # 학습 통계 집계
│   │   └── daily.service.ts      # 데일리 콘텐츠 선정 + 발송 로직
│   │
│   ├── pipeline/                 # 콘텐츠 파이프라인
│   │   ├── crawlers/
│   │   │   └── nhk-easy.ts       # NHK Easy News 크롤러
│   │   ├── importers/
│   │   │   ├── tatoeba.ts        # Tatoeba 문장 데이터 임포트
│   │   │   └── jmdict.ts         # JMdict 사전 데이터 임포트
│   │   ├── generators/
│   │   │   └── quiz-generator.ts # Gemini API 퀴즈 생성기
│   │   ├── classifiers/
│   │   │   └── level-classifier.ts # JLPT 레벨 자동 분류
│   │   └── scheduler.ts          # 데일리 푸시 스케줄러 (node-cron)
│   │
│   ├── db/                       # 데이터베이스 계층
│   │   ├── client.ts             # Drizzle + PostgreSQL 클라이언트
│   │   ├── schema.ts             # 테이블 스키마 정의
│   │   └── migrations/           # DB 마이그레이션 파일
│   │
│   ├── lib/                      # 공통 유틸리티
│   │   ├── fsrs.ts               # FSRS 알고리즘 구현
│   │   ├── gemini.ts             # Gemini API 클라이언트
│   │   └── config.ts             # 환경변수 및 설정 관리
│   │
│   └── types/                    # TypeScript 타입 정의
│       ├── user.ts
│       ├── content.ts
│       ├── quiz.ts
│       └── review.ts
│
├── scripts/                      # 유틸리티 스크립트
│   ├── import-tatoeba.ts         # Tatoeba 데이터 일괄 임포트
│   ├── import-jmdict.ts          # JMdict 데이터 일괄 임포트
│   ├── crawl-nhk.ts              # NHK Easy 수동 크롤링
│   └── generate-quizzes.ts       # 퀴즈 배치 생성
│
├── data/                         # 정적 데이터
│   ├── jlpt-vocab-n5.json        # N5 어휘 목록
│   ├── jlpt-vocab-n4.json        # N4 어휘 목록
│   ├── jlpt-vocab-n3.json        # N3 어휘 목록
│   ├── jlpt-grammar-n5.json      # N5 문법 포인트
│   ├── jlpt-grammar-n4.json      # N4 문법 포인트
│   └── jlpt-grammar-n3.json      # N3 문법 포인트
│
└── tests/                        # 테스트
    ├── services/
    │   ├── quiz.service.test.ts
    │   ├── review.service.test.ts
    │   └── daily.service.test.ts
    └── lib/
        └── fsrs.test.ts
```

---

## 3. DB 스키마 (Drizzle ORM)

### 3.1 ER 다이어그램

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    users     │     │   contents   │     │ vocabularies│
├─────────────┤     ├──────────────┤     ├─────────────┤
│ id (PK)     │     │ id (PK)      │     │ id (PK)     │
│ telegram_id │     │ type         │     │ word        │
│ username    │     │ jlpt_level   │     │ reading     │
│ jlpt_level  │     │ title        │     │ meaning_ko  │
│ daily_time  │     │ body_ja      │     │ jlpt_level  │
│ timezone    │     │ body_reading │     │ part_of_speech│
│ is_active   │     │ body_ko      │     │ content_id  │──→ contents
│ streak_count│     │ source       │     └─────────────┘
│ last_study  │     │ source_url   │
│ created_at  │     │ created_at   │
│ updated_at  │     └──────┬───────┘
└──────┬──────┘            │
       │              ┌────┴────────┐
       │              │   quizzes   │
       │              ├─────────────┤
       │              │ id (PK)     │
       │              │ content_id  │──→ contents
       │              │ type        │
       │              │ question    │
       │              │ options     │ (JSONB)
       │              │ answer      │
       │              │ explanation │
       │              │ jlpt_level  │
       │              │ difficulty  │
       │              │ created_at  │
       │              └──────┬──────┘
       │                     │
       │    ┌────────────────┴──────────────┐
       │    │      user_quiz_results        │
       │    ├───────────────────────────────┤
       │    │ id (PK)                       │
       ├──→│ user_id (FK)                  │
       │    │ quiz_id (FK)                  │──→ quizzes
       │    │ user_answer                   │
       │    │ is_correct                    │
       │    │ time_spent_ms                 │
       │    │ answered_at                   │
       │    └───────────────────────────────┘
       │
       │    ┌───────────────────────────────┐
       │    │       review_cards            │
       │    ├───────────────────────────────┤
       ├──→│ id (PK)                       │
       │    │ user_id (FK)                  │
       │    │ card_type                     │ (vocabulary/grammar/sentence)
       │    │ card_ref_id                   │
       │    │ stability                     │ (FSRS)
       │    │ difficulty                    │ (FSRS)
       │    │ due_date                      │
       │    │ last_review                   │
       │    │ reps                          │
       │    │ lapses                        │
       │    │ state                         │ (new/learning/review/relearning)
       │    │ created_at                    │
       │    └───────────────────────────────┘
       │
       │    ┌───────────────────────────────┐
       │    │        daily_logs             │
       │    ├───────────────────────────────┤
       └──→│ id (PK)                       │
            │ user_id (FK)                  │
            │ date                          │
            │ content_id (FK)               │──→ contents
            │ quizzes_completed             │
            │ correct_count                 │
            │ total_count                   │
            │ study_minutes                 │
            │ created_at                    │
            └───────────────────────────────┘
```

### 3.2 스키마 정의 (Drizzle)

```typescript
// src/db/schema.ts

import { pgTable, serial, text, integer, boolean, timestamp,
         varchar, jsonb, real, date, uniqueIndex, index } from 'drizzle-orm/pg-core';

// ====== ENUMS ======

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type ContentType = 'news' | 'sentence' | 'grammar' | 'vocabulary';
export type ContentSource = 'nhk_easy' | 'tatoeba' | 'jmdict' | 'generated';
export type QuizType = 'reading' | 'vocabulary' | 'grammar' | 'translate' | 'comprehension';
export type CardType = 'vocabulary' | 'grammar' | 'sentence';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

// ====== TABLES ======

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: varchar('telegram_id', { length: 64 }).notNull().unique(),
  username: varchar('username', { length: 128 }),
  jlptLevel: varchar('jlpt_level', { length: 2 }).notNull().default('N5'),
  dailyTime: varchar('daily_time', { length: 5 }).notNull().default('08:00'), // HH:mm
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
  type: varchar('type', { length: 20 }).notNull(),         // ContentType
  jlptLevel: varchar('jlpt_level', { length: 2 }).notNull(),
  title: text('title'),
  bodyJa: text('body_ja').notNull(),                        // 일본어 원문
  bodyReading: text('body_reading'),                        // 후리가나 포함 텍스트
  bodyKo: text('body_ko'),                                  // 한국어 번역
  source: varchar('source', { length: 20 }).notNull(),      // ContentSource
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_contents_level_type').on(table.jlptLevel, table.type),
]);

export const vocabularies = pgTable('vocabularies', {
  id: serial('id').primaryKey(),
  word: varchar('word', { length: 100 }).notNull(),
  reading: varchar('reading', { length: 200 }).notNull(),   // 히라가나 읽기
  meaningKo: text('meaning_ko').notNull(),
  jlptLevel: varchar('jlpt_level', { length: 2 }).notNull(),
  partOfSpeech: varchar('part_of_speech', { length: 30 }),  // 명사, 동사, 형용사 등
  contentId: integer('content_id').references(() => contents.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_vocab_level').on(table.jlptLevel),
  index('idx_vocab_word').on(table.word),
]);

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').references(() => contents.id),
  type: varchar('type', { length: 20 }).notNull(),          // QuizType
  question: text('question').notNull(),
  options: jsonb('options'),                                 // 4지선다: ["A", "B", "C", "D"]
  answer: text('answer').notNull(),
  explanation: text('explanation'),                          // 해설
  jlptLevel: varchar('jlpt_level', { length: 2 }).notNull(),
  difficulty: integer('difficulty').notNull().default(1),    // 1-5
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
  cardType: varchar('card_type', { length: 20 }).notNull(),  // CardType
  cardRefId: integer('card_ref_id').notNull(),                // vocabularies.id 또는 quizzes.id
  stability: real('stability').notNull().default(0),          // FSRS
  difficulty: real('difficulty').notNull().default(0),         // FSRS
  dueDate: timestamp('due_date').notNull(),
  lastReview: timestamp('last_review'),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  state: varchar('state', { length: 20 }).notNull().default('new'), // CardState
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
```

---

## 4. 핵심 모듈 설계

### 4.1 Telegram 봇 (grammY)

#### 4.1.1 봇 초기화 및 미들웨어

```typescript
// src/bot/bot.ts

import { Bot, session, Context } from 'grammy';
import { type SessionData } from './middleware/session';

export type BotContext = Context & { session: SessionData };

export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  // 미들웨어
  bot.use(session({ initial: () => createInitialSession() }));
  bot.use(authMiddleware);    // 사용자 등록 확인

  // 명령어 등록
  bot.command('start', startHandler);
  bot.command('level', levelHandler);
  bot.command('time', timeHandler);
  bot.command('quiz', quizHandler);
  bot.command('review', reviewHandler);
  bot.command('stats', statsHandler);
  bot.command('hint', hintHandler);
  bot.command('skip', skipHandler);
  bot.command('explain', explainHandler);

  // 콜백 쿼리 (인라인 키보드)
  bot.callbackQuery(/^quiz_answer:/, quizAnswerCallback);
  bot.callbackQuery(/^review_rate:/, reviewRatingCallback);
  bot.callbackQuery(/^daily_action:/, dailyActionCallback);

  return bot;
}
```

#### 4.1.2 세션 데이터

```typescript
// src/bot/middleware/session.ts

export interface SessionData {
  // 현재 퀴즈 진행 상태
  activeQuiz: {
    quizIds: number[];       // 오늘의 퀴즈 ID 목록
    currentIndex: number;    // 현재 진행 인덱스
    correctCount: number;
    startedAt: number;       // timestamp
  } | null;

  // 현재 복습 진행 상태
  activeReview: {
    cardIds: number[];
    currentIndex: number;
    startedAt: number;
  } | null;

  // 마지막 퀴즈 ID (hint/explain용)
  lastQuizId: number | null;
}
```

#### 4.1.3 명령어 플로우

**`/start` — 온보딩**
```
사용자 → /start
  ↓
신규 사용자?
  ├─ YES → 레벨 선택 인라인 키보드 표시
  │         ↓ 선택
  │         학습 시간 설정 안내 (/time HH:mm)
  │         ↓ 설정 완료
  │         환영 메시지 + 첫 학습 제안
  └─ NO  → "이미 등록되어 있습니다" + 현재 설정 표시
```

**`/quiz` — 퀴즈 진행**
```
사용자 → /quiz [type?]
  ↓
type 지정?
  ├─ YES → 해당 타입 퀴즈만 로드
  └─ NO  → 오늘의 콘텐츠 기반 랜덤 4종 퀴즈 로드
  ↓
session.activeQuiz에 퀴즈 목록 저장
  ↓
첫 번째 퀴즈 메시지 전송 (인라인 키보드 4지선다)
  ↓
사용자 정답 선택 (callbackQuery: quiz_answer:{quizId}:{answer})
  ↓
채점 → 결과 표시 (정답/오답 + 해설)
  ↓
다음 퀴즈 전송 또는 최종 결과 요약
```

**`/review` — 복습**
```
사용자 → /review
  ↓
FSRS 기반 today's due cards 조회 (due_date <= now)
  ↓
카드 없음?
  ├─ YES → "오늘 복습할 카드가 없습니다!"
  └─ NO  → 첫 카드 앞면 표시 + [뒤집기] 버튼
            ↓ 뒤집기
            뒷면 표시 + [Again] [Hard] [Good] [Easy] 버튼
            ↓ 평가 선택
            FSRS 업데이트 → 다음 카드 또는 복습 완료 요약
```

**`/stats` — 통계**
```
사용자 → /stats
  ↓
최근 7일 DailyLogs 조회
  ↓
텍스트 기반 통계 메시지 생성:
  - 이번 주 학습 막대 그래프 (████░░)
  - 연속 학습일 (스트릭)
  - 퀴즈 유형별 정답률
  - 복습 카드 현황 (오늘 남은/완료)
```

### 4.2 콘텐츠 파이프라인

#### 4.2.1 NHK Easy 크롤러

```typescript
// src/pipeline/crawlers/nhk-easy.ts

interface NhkArticle {
  id: string;
  title: string;
  titleWithRuby: string;    // 후리가나 포함 HTML
  body: string;
  bodyWithRuby: string;
  publishedAt: Date;
  url: string;
}

// 크롤링 전략:
// 1. NHK Easy News 목록 페이지에서 최신 기사 ID 수집
// 2. 각 기사의 JSON API 호출로 본문 획득
// 3. Ruby 태그에서 후리가나 추출
// 4. Gemini API로 한국어 번역 생성
// 5. 레벨 분류기로 JLPT 레벨 태깅
// 6. contents 테이블에 저장
//
// 실행 주기: 매일 1회 (새벽 크론)
```

#### 4.2.2 레벨 분류기

```typescript
// src/pipeline/classifiers/level-classifier.ts

// 분류 로직:
// 1. 텍스트를 형태소 분석 (간이 방식: 어휘 DB 매칭)
// 2. 각 단어의 JLPT 레벨 조회 (vocabularies 테이블)
// 3. 가장 높은 레벨의 단어 비율로 전체 레벨 결정
//
// 분류 규칙:
// - N5 어휘만 포함 → N5
// - N4 이하 어휘 포함, N3+ 비율 < 10% → N4
// - N3 이하 어휘 포함, N2+ 비율 < 10% → N3
// - 판별 어려운 경우 → NHK Easy 출처는 기본 N3

interface ClassificationResult {
  level: JlptLevel;
  confidence: number;        // 0-1
  wordLevelBreakdown: Record<JlptLevel, number>;
}

function classifyLevel(text: string): Promise<ClassificationResult>;
```

#### 4.2.3 Gemini 퀴즈 생성기

```typescript
// src/pipeline/generators/quiz-generator.ts

// 퀴즈 생성 전략:
// 1. 콘텐츠(문장/뉴스)를 입력으로 받음
// 2. Gemini API에 구조화된 프롬프트 전송
// 3. JSON 응답을 파싱하여 퀴즈 객체 생성
// 4. quizzes 테이블에 저장
//
// API 호출 최적화:
// - 하나의 콘텐츠에서 4종 퀴즈를 한번의 API 호출로 생성
// - 배치 생성 (매일 새벽에 다음날 퀴즈 사전 생성)
// - 생성된 퀴즈는 DB에 캐싱 → 재사용

interface GeneratedQuiz {
  type: QuizType;
  question: string;
  options: string[];         // 4지선다 (선택형만)
  answer: string;
  explanation: string;
}

// Gemini 프롬프트 구조:
const QUIZ_GENERATION_PROMPT = `
당신은 일본어 교육 전문가입니다.
다음 일본어 텍스트를 기반으로 {level} 수준의 학습 퀴즈를 생성하세요.

텍스트: {content}

다음 4종류의 퀴즈를 JSON 배열로 생성하세요:
1. reading: 한자 읽기 퀴즈 (4지선다)
2. vocabulary: 어휘 의미 퀴즈 (4지선다)
3. grammar: 문법 빈칸 퀴즈 (4지선다)
4. translate: 번역 퀴즈 (정답 텍스트)

각 퀴즈의 오답은 학습자가 흔히 혼동하는 것으로 구성하세요.
반드시 JSON 형식으로만 응답하세요.
`;

// Gemini 모델 선택:
// - 기본: gemini-2.5-flash (250건/일 무료)
// - 배치 대량 생성: gemini-2.5-flash-lite (1,000건/일 무료)
```

### 4.3 FSRS 복습 시스템

```typescript
// src/lib/fsrs.ts

// FSRS (Free Spaced Repetition Scheduler) 구현
// 참조: https://github.com/open-spaced-repetition/ts-fsrs

// 핵심 파라미터:
// - stability (S): 기억 안정성. 높을수록 오래 기억
// - difficulty (D): 카드 난이도. 0-10 범위
// - retrievability (R): 현재 기억 확률. S와 경과 시간으로 계산

// 평가 등급:
// Again (1): 완전히 모름 → 짧은 간격으로 재학습
// Hard  (2): 어렵게 기억 → 간격 약간 증가
// Good  (3): 정상 기억   → 정상 간격 증가
// Easy  (4): 쉽게 기억   → 간격 크게 증가

interface FsrsCard {
  stability: number;
  difficulty: number;
  dueDate: Date;
  lastReview: Date | null;
  reps: number;
  lapses: number;
  state: CardState;
}

interface FsrsResult {
  card: FsrsCard;            // 업데이트된 카드
  nextDueDate: Date;         // 다음 복습일
  interval: number;          // 다음 간격 (일)
}

// ts-fsrs 라이브러리를 사용하여 구현
// npm: ts-fsrs
function reviewCard(card: FsrsCard, rating: 1 | 2 | 3 | 4): FsrsResult;
```

### 4.4 데일리 스케줄러

```typescript
// src/pipeline/scheduler.ts

// 스케줄링 전략:
// 1. 1분 간격으로 크론 실행
// 2. 현재 시각(UTC) 기준, daily_time이 일치하는 사용자 조회
//    → users WHERE daily_time = {currentHHmm} AND timezone = {tz} AND is_active = true
// 3. 각 사용자의 레벨에 맞는 오늘의 콘텐츠 선정
// 4. 사전 생성된 퀴즈가 있으면 연결, 없으면 실시간 생성
// 5. 데일리 메시지 포맷팅 → Telegram 전송
// 6. daily_logs에 기록

// 크론 스케줄:
// - 데일리 푸시: */1 * * * * (매 1분, 시간대별 사용자 조회)
// - NHK 크롤링: 0 3 * * * (매일 새벽 3시)
// - 퀴즈 사전생성: 0 4 * * * (매일 새벽 4시)
// - 스트릭 업데이트: 0 0 * * * (매일 자정)

// 콘텐츠 선정 알고리즘:
// 1. 사용자 레벨에 맞는 미사용 콘텐츠 우선
// 2. 미사용 콘텐츠 없으면 → 가장 오래전 사용한 콘텐츠
// 3. 콘텐츠 유형 로테이션: news → sentence → grammar → vocabulary
```

---

## 5. API 인터페이스

### 5.1 Telegram 콜백 데이터 규격

```
콜백 쿼리 데이터 형식:
  quiz_answer:{quizId}:{selectedOption}
  review_rate:{cardId}:{rating}
  daily_action:{action}:{contentId}

예시:
  quiz_answer:42:A          → 퀴즈 42번, A 선택
  review_rate:15:3           → 카드 15번, Good(3) 평가
  daily_action:quiz:100      → 콘텐츠 100 기반 퀴즈 시작
  daily_action:review:0      → 복습 시작
```

### 5.2 Gemini API 요청/응답

```
요청:
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent

{
  "contents": [{
    "parts": [{ "text": "{프롬프트}" }]
  }],
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": { ... }   // 퀴즈 JSON 스키마
  }
}

응답 (파싱된 JSON):
[
  {
    "type": "reading",
    "question": "「観光客」의 읽기는?",
    "options": ["かんこうきゃく", "かんこうかく", "みこうきゃく", "かんひかりきゃく"],
    "answer": "かんこうきゃく",
    "explanation": "観(かん)+光(こう)+客(きゃく)"
  },
  ...
]
```

---

## 6. 핵심 플로우 시퀀스

### 6.1 데일리 콘텐츠 전송

```
[Cron: 매 1분]
     │
     ▼
 현재 시간에 해당하는 사용자 조회
 (daily_time + timezone 매칭)
     │
     ▼
 사용자별 콘텐츠 선정
 (레벨 + 미사용 우선 + 유형 로테이션)
     │
     ▼
 해당 콘텐츠의 퀴즈 존재 확인
     │
     ├─ 있음 → DB에서 로드
     └─ 없음 → Gemini API 실시간 생성 → DB 저장
     │
     ▼
 데일리 메시지 포맷팅
 (오늘의 문장 + 단어 + 문법 + 인라인 키보드)
     │
     ▼
 Telegram sendMessage API 호출
     │
     ▼
 daily_logs 기록
 스트릭 업데이트 확인
```

### 6.2 퀴즈 진행

```
 사용자: /quiz
     │
     ▼
 오늘의 콘텐츠 기반 퀴즈 4문제 로드
     │
     ▼
 session.activeQuiz에 저장
     │
     ▼
 Q1 메시지 전송 ──→ [A] [B] [C] [D] 인라인 키보드
     │
     ▼
 사용자 선택 (callbackQuery)
     │
     ▼
 채점: user_quiz_results 저장
     │
     ├─ 정답 → "✅ 정답! + 해설" 표시
     └─ 오답 → "❌ 오답. 정답은 X + 해설" 표시
     │
     ▼
 오답 어휘/문법 → review_cards에 자동 추가 (FSRS new 상태)
     │
     ▼
 다음 문제 or 최종 결과 요약
 ("4/4 정답! 연속 학습 15일째!")
```

### 6.3 복습 카드 플로우

```
 사용자: /review
     │
     ▼
 review_cards WHERE user_id = ? AND due_date <= now()
 ORDER BY due_date ASC, LIMIT 10
     │
     ▼
 카드 없음? → "복습 완료! 다음 복습: 내일 3장"
     │
     ▼
 카드 앞면 표시
 (card_type에 따라 다름:
   vocabulary → 단어만 표시
   grammar   → 문법 패턴만 표시
   sentence  → 일본어 문장만 표시)
     │
     ▼
 [뒤집기] 버튼
     │
     ▼
 카드 뒷면 표시
 (읽기 + 의미 + 예문)
     │
     ▼
 [Again] [Hard] [Good] [Easy]
     │
     ▼
 FSRS 계산 → review_cards 업데이트
 다음 카드 or 복습 완료 요약
```

---

## 7. 환경변수 및 설정

```bash
# .env.example

# 프로젝트 식별자
PROJECT_NAME=nihongo

# Telegram Bot
BOT_TOKEN=                     # @BotFather에서 발급

# PostgreSQL (홈서버 공유 인프라)
DB_HOST=shared-postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=                   # 공유 postgres 비밀번호
DB_NAME=nihongo
DB_SSLMODE=disable

# Redis (프로젝트 전용 인스턴스)
REDIS_HOST=nihongo-redis
REDIS_PORT=6379
REDIS_PASSWORD=                # 전용 Redis 비밀번호

# Gemini API
GEMINI_API_KEY=                # Google AI Studio에서 발급

# Scheduler
DAILY_CRON_ENABLED=true        # 데일리 푸시 스케줄러 on/off
NHK_CRAWL_CRON=0 3 * * *      # NHK 크롤링 스케줄
QUIZ_BATCH_CRON=0 4 * * *     # 퀴즈 배치 생성 스케줄

# App Config
DEFAULT_TIMEZONE=Asia/Seoul
MAX_DAILY_QUIZZES=10           # 하루 최대 퀴즈 수
MAX_REVIEW_CARDS=20            # 한 세션 최대 복습 카드 수
```

---

## 8. 의존성 패키지

```json
{
  "dependencies": {
    "grammy": "^1.x",                  // Telegram Bot 프레임워크
    "drizzle-orm": "^0.x",             // ORM
    "postgres": "^3.x",                // PostgreSQL 드라이버 (drizzle용, shared-postgres 연결)
    "ioredis": "^5.x",                 // Redis 클라이언트 (세션 스토리지)
    "@google/generative-ai": "^0.x",   // Gemini API SDK
    "ts-fsrs": "^4.x",                 // FSRS 알고리즘 라이브러리
    "node-cron": "^3.x",              // 크론 스케줄러
    "cheerio": "^1.x",                // NHK Easy HTML 파싱
    "dayjs": "^1.x",                  // 날짜/시간 유틸리티
    "dotenv": "^16.x",                // 환경변수 로드
    "zod": "^3.x"                     // 런타임 타입 검증
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x",                     // TS 실행 (개발용)
    "drizzle-kit": "^0.x",            // 마이그레이션 생성
    "vitest": "^2.x",                 // 테스트 프레임워크
    "@types/node": "^22.x",
    "@types/node-cron": "^3.x"
  }
}
```

---

## 9. 구현 순서 (Build Sequence)

```
Week 1: 프로젝트 셋업 + 봇 기본
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Step 1. 프로젝트 초기화
  ├── npm init, TypeScript 설정
  ├── drizzle.config.ts 설정
  ├── .env 구성
  ├── 홈서버 DB 생성: docker exec -it shared-postgres psql -U postgres -c "CREATE DATABASE nihongo;"
  └── docker-compose.yml + Dockerfile 작성

  Step 2. DB 스키마 + 마이그레이션
  ├── src/db/schema.ts 작성
  ├── drizzle-kit generate → 마이그레이션 생성
  └── drizzle-kit push → DB 적용

  Step 3. 봇 기본 구조
  ├── src/bot/bot.ts (grammY 인스턴스)
  ├── src/bot/middleware/auth.ts
  ├── src/bot/middleware/session.ts
  └── src/index.ts (엔트리포인트)

  Step 4. 핵심 명령어
  ├── /start (온보딩 + 레벨 선택)
  ├── /level (레벨 변경)
  └── /time (학습 시간 설정)

Week 2: 콘텐츠 파이프라인
━━━━━━━━━━━━━━━━━━━━━━━━

  Step 5. 정적 데이터 준비
  ├── data/jlpt-vocab-n5~n3.json (JLPT 어휘 목록)
  ├── data/jlpt-grammar-n5~n3.json (JLPT 문법)
  └── scripts/import-jmdict.ts (사전 데이터 임포트)

  Step 6. NHK Easy 크롤러
  ├── src/pipeline/crawlers/nhk-easy.ts
  ├── cheerio로 기사 파싱
  └── scripts/crawl-nhk.ts (수동 실행 스크립트)

  Step 7. Tatoeba 임포트
  ├── scripts/import-tatoeba.ts
  └── TSV 파싱 → contents/vocabularies 저장

  Step 8. Gemini 퀴즈 생성기
  ├── src/lib/gemini.ts (API 클라이언트)
  ├── src/pipeline/generators/quiz-generator.ts
  └── scripts/generate-quizzes.ts (배치 생성)

Week 3: 데일리 푸시 + 퀴즈
━━━━━━━━━━━━━━━━━━━━━━━━━

  Step 9. 데일리 서비스
  ├── src/services/daily.service.ts (콘텐츠 선정)
  ├── src/services/content.service.ts (콘텐츠 조회)
  └── src/bot/messages/daily.ts (메시지 포맷)

  Step 10. 스케줄러
  ├── src/pipeline/scheduler.ts (node-cron)
  └── 시간대별 사용자 매칭 + 전송

  Step 11. 퀴즈 기능
  ├── src/services/quiz.service.ts
  ├── src/bot/commands/quiz.ts
  ├── src/bot/callbacks/quiz-answer.ts
  ├── src/bot/messages/quiz.ts
  └── /hint, /skip, /explain 명령어

Week 4: 복습 + 통계 + 배포
━━━━━━━━━━━━━━━━━━━━━━━━━

  Step 12. FSRS 복습
  ├── src/lib/fsrs.ts (ts-fsrs 래핑)
  ├── src/services/review.service.ts
  ├── src/bot/commands/review.ts
  ├── src/bot/callbacks/review-rating.ts
  └── 오답 자동 복습카드 등록

  Step 13. 통계
  ├── src/services/stats.service.ts
  ├── src/bot/commands/stats.ts
  └── src/bot/messages/stats.ts (텍스트 그래프)

  Step 14. 홈서버 배포
  ├── GitHub Actions CI/CD 워크플로우 작성
  ├── 홈서버 ~/docker/nihongo/ 에 docker-compose.yml 배치
  ├── Cloudflare Tunnel에 nihongo.dltmxm.link 추가 (Phase 2 웹용, 봇은 불필요)
  └── docker compose up -d → 크론 동작 확인
```

---

## 10. 테스트 전략

| 대상 | 방법 | 도구 |
|------|------|------|
| FSRS 알고리즘 | 단위 테스트 (간격 계산 정확성) | vitest |
| 퀴즈 채점 로직 | 단위 테스트 | vitest |
| 레벨 분류기 | 단위 테스트 (알려진 텍스트 검증) | vitest |
| Gemini 응답 파싱 | 단위 테스트 (JSON 스키마 검증) | vitest + zod |
| 봇 명령어 | 수동 테스트 (Telegram 테스트 봇) | BotFather 테스트 토큰 |
| 스케줄러 | 수동 테스트 (크론 간격 축소) | 로컬 실행 |
| NHK 크롤러 | 수동 테스트 + 스냅샷 | scripts/crawl-nhk.ts |

---

## 11. 배포 아키텍처 (홈서버)

```
┌─────────────────────────────────────────────────────────┐
│  홈서버 (Intel N150 · 16GB RAM · Ubuntu Server)          │
│  ~/docker/nihongo/                                       │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  nihongo-app (Docker Container)                     │ │
│  │  ┌──────────┐  ┌───────────────┐                   │ │
│  │  │ grammY   │  │  node-cron    │                   │ │
│  │  │ Bot      │  │  Scheduler    │                   │ │
│  │  │ (polling)│  │  - daily push │                   │ │
│  │  │          │  │  - nhk crawl  │                   │ │
│  │  │          │  │  - quiz batch │                   │ │
│  │  └────┬─────┘  └───────┬───────┘                   │ │
│  │       └────────┬────────┘                           │ │
│  │                │                                    │ │
│  │    ┌───────────┴──────────┐                         │ │
│  │    │   Service Layer      │                         │ │
│  │    │   + Drizzle ORM      │                         │ │
│  │    └───────────┬──────────┘                         │ │
│  └────────────────┼────────────────────────────────────┘ │
│                    │                                      │
│    ┌───────────────┼───────────────┐                     │
│    │               │               │                     │
│  ┌─┴────────────┐ │ ┌─────────────┴──┐                  │
│  │shared-postgres│ │ │ nihongo-redis  │                  │
│  │ (공유 DB)    │ │ │ (전용 Redis)   │                  │
│  │ DB: nihongo  │ │ │ redis:7-alpine │                  │
│  └──────────────┘ │ └────────────────┘                  │
│                    │                                      │
│  networks: proxy, shared, nihongo-internal               │
│  Grafana 모니터링: grafana.dltmxm.link (Tailscale)       │
└────────────────────┼──────────────────────────────────────┘
                     │ (외부 API)
              ┌──────┴──────────────┐
              │  Gemini API         │
              │  (무료 티어)         │
              │  Flash / Flash-Lite │
              └─────────────────────┘
```

### docker-compose.yml

```yaml
# ~/docker/nihongo/docker-compose.yml

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: nihongo-app
    restart: unless-stopped
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - DB_HOST=shared-postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=nihongo
      - DB_SSLMODE=disable
      - REDIS_HOST=nihongo-redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - DAILY_CRON_ENABLED=true
      - DEFAULT_TIMEZONE=Asia/Seoul
    networks:
      - shared
      - nihongo-internal
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    container_name: nihongo-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - nihongo-internal
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  shared:
    external: true
  nihongo-internal:
    driver: bridge

volumes:
  redis_data:
```

### Dockerfile

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY data/ ./data/
CMD ["node", "dist/index.js"]
```

### 배포 절차

```bash
# 1. 홈서버에서 DB 생성
docker exec -it shared-postgres psql -U postgres -c "CREATE DATABASE nihongo;"

# 2. 디렉토리 준비
mkdir -p ~/docker/nihongo && cd ~/docker/nihongo

# 3. 환경변수 설정
cp .env.example .env && nano .env

# 4. 빌드 + 실행
docker compose up -d --build

# 5. 상태 확인
docker compose ps
docker compose logs -f nihongo-app

# 6. Grafana에서 모니터링 확인
# grafana.dltmxm.link (Tailscale)
```

### 비용 예상 (월간)

| 항목 | 서비스 | 비용 |
|------|--------|------|
| 봇 호스팅 | 홈서버 (이미 운영중) | **$0** |
| DB | shared-postgres (이미 운영중) | **$0** |
| Redis | nihongo-redis (전용) | **$0** |
| AI | Gemini (Free) | $0 |
| 모니터링 | Grafana (이미 운영중) | **$0** |
| **합계** | | **$0/월** |
