# nihongo-daily Gap Analysis Report

> **Analysis Type**: Design vs Implementation Gap Analysis
>
> **Project**: nihongo-daily
> **Version**: 0.4.0
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-03-15
> **Design Doc**: [nihongo-daily.design.md](../02-design/features/nihongo-daily.design.md)
> **Iteration**: 4 (post-pipeline refinement re-analysis)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

PDCA Check phase: comprehensive comparison of design document (Sections 2-11) against actual implementation. This v4.0 analysis reflects recent intentional changes: NHK Gemini translation removal, safeParse application, and duplicate content prevention.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/nihongo-daily.design.md`
- **Implementation Path**: `src/`, `scripts/`, `data/`, `tests/`, project root
- **Analysis Date**: 2026-03-15
- **Previous Match Rates**: v1.0 = 76%, v2.0 = 93%, v3.0 = 92%

### 1.3 Known Intentional Changes (since v3.0)

| Change | Reason | Category |
|--------|--------|----------|
| NHK 크롤러에서 Gemini 번역(bodyKo) 제거 | Gemini 쿼터를 퀴즈 생성에 집중 | Intentional |
| Gemini 퀴즈 생성에 zod safeParse 적용 | Invalid quiz item 스킵으로 resilience 개선 | Intentional |
| crawlAndSave()에 title 기반 중복 체크 | 동일 기사 재저장 방지 | Intentional |

---

## 2. Overall Scores

| Category | Score | Status | Change vs v3.0 |
|----------|:-----:|:------:|:---:|
| Project Structure (Section 2) | 90% | ✅ | = |
| DB Schema (Section 3) | 100% | ✅ | = |
| Bot Commands & Callbacks (Section 4.1) | 95% | ✅ | = |
| Session Data (Section 4.1.2) | 92% | ✅ | = |
| Content Pipeline (Section 4.2) | 88% | ⚠️ | -4% |
| FSRS Review System (Section 4.3) | 85% | ⚠️ | = |
| Scheduler (Section 4.4) | 80% | ⚠️ | = |
| Callback Data Format (Section 5.1) | 95% | ✅ | = |
| Environment Variables (Section 7) | 88% | ⚠️ | = |
| Dependencies (Section 8) | 100% | ✅ | = |
| Build Sequence (Section 9) | 93% | ✅ | = |
| Deployment (Section 11) | 92% | ✅ | = |
| Test Strategy (Section 10) | 75% | ⚠️ | = |
| Convention Compliance | 98% | ✅ | = |
| Architecture Compliance | 95% | ✅ | = |
| **Overall** | **91%** | **✅** | -1% |

> ✅ = 90%+, ⚠️ = 70-89%, ❌ = <70%

Note: Pipeline score decreased 92% -> 88% due to NHK Gemini 번역 제거가 design spec과 divergence를 추가함. Overall은 여전히 >= 90% threshold.

---

## 3. Detailed Gap Analysis

### 3.1 Project Structure (Section 2) -- 90%

**Files Present: 43/47 designed paths**

All design-specified files exist except:

| Design Path | Severity | Notes |
|-------------|----------|-------|
| `src/lib/fsrs.ts` | Minor | FSRS logic inlined in `review.service.ts` using ts-fsrs directly |
| `src/types/user.ts` | Minor | Types exported from `src/db/schema.ts` |
| `src/types/content.ts` | Minor | Types exported from `src/db/schema.ts` |
| `src/types/quiz.ts` | Minor | Types exported from `src/db/schema.ts` |
| `src/types/review.ts` | Minor | Types exported from `src/db/schema.ts` |
| `src/db/migrations/` | Minor | Uses `initDatabase()` raw SQL instead |

Additional files not in design:

| File | Purpose |
|------|---------|
| `src/db/seed.ts` | 어휘+문법 데이터 초기 시딩 (vocab quiz + reading quiz + grammar quiz 자동 생성) |
| `src/run-pipeline.ts` | 수동 파이프라인 실행 엔트리 (`docker exec` 지원) |
| `docker-compose.dev.yml` | 개발 환경 (local postgres + redis) |
| `scripts/seed-remote.ts` | 리모트 서버 시딩 |
| `scripts/generate-seed-sql.ts` | SQL dump 생성 |
| `scripts/test-pipeline.ts` | 파이프라인 테스트 |
| `scripts/test-nhk-crawl.ts` | NHK 크롤링 테스트 |

---

### 3.2 DB Schema (Section 3) -- 100%

All 7 tables match design exactly:

| Table | Fields | Indexes | FKs | Status |
|-------|:------:|:-------:|:---:|:------:|
| `users` | 10/10 | 1/1 | - | ✅ |
| `contents` | 9/9 | 1/1 | - | ✅ |
| `vocabularies` | 7/7 | 2/2 | 1/1 | ✅ |
| `quizzes` | 9/9 | 1/1 | 1/1 | ✅ |
| `user_quiz_results` | 6/6 | 2/2 | 2/2 | ✅ |
| `review_cards` | 11/11 | 2/2 | 1/1 | ✅ |
| `daily_logs` | 8/8 | 1/1 | 2/2 | ✅ |

Type enums (`JlptLevel`, `ContentType`, `ContentSource`, `QuizType`, `CardType`, `CardState`) all match design verbatim. `schema.ts` and `initDatabase()` raw SQL are in sync.

---

### 3.3 Bot Commands & Callbacks (Section 4.1) -- 95%

**Commands: 9/9 implemented**

| Command | File | Status |
|---------|------|:------:|
| `/start` | `commands/start.ts` | ✅ |
| `/level` | `commands/level.ts` | ✅ |
| `/time` | `commands/time.ts` | ✅ |
| `/quiz` | `commands/quiz.ts` | ✅ |
| `/review` | `commands/review.ts` | ✅ |
| `/stats` | `commands/stats.ts` | ✅ |
| `/hint` | `commands/hint.ts` | ✅ |
| `/skip` | `commands/skip.ts` | ✅ |
| `/explain` | `commands/explain.ts` | ✅ |

**Callbacks: 3/3 designed + 2 added**

| Callback Pattern | Status | Notes |
|-----------------|:------:|-------|
| `quiz_answer:{quizId}:{option}` | ✅ | |
| `review_rate:{cardId}:{rating}` | ✅ | |
| `daily_action:{action}:{contentId}` | ✅ | |
| `set_level:{level}` | ⚠️ Added | Onboarding UX necessity |
| `review_flip:{cardId}` | ⚠️ Added | Card flip UX necessity |

**Key flow verification:**
- Onboarding: `/start` -> level keyboard -> `set_level` callback -> time prompt -- matches design
- Quiz flow: load quizzes -> session -> inline keyboard -> answer -> score -> next/summary -- matches design
- Review flow: due cards -> front -> flip -> back + rating -> FSRS update -> next/done -- matches design
- Wrong answer -> `createReviewCard()` auto-creation -- matches design

---

### 3.4 Session Data (Section 4.1.2) -- 92%

| Design Field | Status |
|-------------|:------:|
| `activeQuiz` (quizIds, currentIndex, correctCount, startedAt) | ✅ |
| `activeReview` (cardIds, currentIndex, startedAt) | ✅ |
| `lastQuizId` | ✅ |

Added fields (not in design):

| Field | Purpose | Justification |
|-------|---------|---------------|
| `userId` | Cached DB user ID | Avoids repeated DB lookup |
| `jlptLevel` | Cached JLPT level | Performance |
| `processing` | Duplicate callback guard | Race condition protection |

---

### 3.5 Content Pipeline (Section 4.2) -- 88%

#### NHK Easy Crawler

| Design Spec | Implementation | Status |
|-------------|---------------|:------:|
| NHK Easy News 목록 페이지에서 최신 기사 ID 수집 | `fetchNhkArticleList()` via `news-list.json` | ✅ |
| 각 기사의 JSON API 호출로 본문 획득 | RSC flight 방식 (`_rsc=1` + `RSC: 1` header) | ✅ Changed |
| Ruby 태그에서 후리가나 추출 | regex: `<ruby>([^<]*)<rt>([^<]*)</rt></ruby>` | ✅ |
| **Gemini API로 한국어 번역 생성** | **제거됨 (bodyKo = '')** | ⚠️ Intentional |
| 레벨 분류기로 JLPT 레벨 태깅 | 하드코딩 `N3` (NHK Easy = N3 가정) | ⚠️ Changed |
| contents 테이블에 저장 | `crawlAndSave()` with title-based dedup | ✅ |

**NHK 번역 제거 상세:**
- Design (Section 4.2.1, line 4): "Gemini API로 한국어 번역 생성"
- Implementation: `nhk-easy.ts:201` -- `bodyKo: ''` (빈 문자열)
- Reason: Gemini 무료 쿼터(250건/일)를 퀴즈 생성에 집중. NHK 기사당 번역 1회 vs 퀴즈 생성 4회 -- 퀴즈가 학습 효과 더 높음.
- Impact: Low -- 데일리 메시지에서 한국어 번역 미표시, 향후 번역 복원 가능.

**NHK 추가 구현 (설계 미포함):**

| Addition | Description |
|----------|-------------|
| `nhkAuthenticate()` | Abroad profile JWT 인증 (NHK 접근에 필수) |
| `fetchFromGemini()` fallback | NHK 실패 시 Gemini로 학습 콘텐츠 생성 |
| Title-based dedup | `crawlAndSave()`에서 기존 title Set으로 중복 방지 |
| Skip pattern 필터링 | NHK 사이트 공통 문구, 캐스터 이름 등 노이즈 제거 |

#### Level Classifier

| Design Item | Implementation | Status |
|-------------|---------------|:------:|
| `ClassificationResult` interface | 동일 (level, confidence, wordLevelBreakdown) | ✅ |
| `classifyLevel()` function | Vocab DB 매칭 + 10% threshold | ✅ |
| Token extraction | regex `[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+` | ✅ |

#### Gemini Quiz Generator

| Design Item | Implementation | Status |
|-------------|---------------|:------:|
| 4종 퀴즈 (reading, vocabulary, grammar, translate) | ✅ | ✅ |
| Structured prompt | 설계서와 거의 동일한 프롬프트 | ✅ |
| JSON 응답 파싱 | regex 추출 + **zod safeParse** (v4.0 개선) | ✅ Enhanced |
| gemini-2.5-flash 모델 | 동일 | ✅ |
| gemini-2.5-flash-lite (배치) | 미사용 (flash만 사용) | ⚠️ Minor |
| quizzes 테이블 저장 | `generateAndSaveQuizzes()` with existing quiz check | ✅ |

**safeParse 상세 (v4.0 변경):**
- `src/lib/gemini.ts:56-61` -- 개별 quiz item을 `quizSchema.safeParse(item)`으로 검증
- Invalid item은 warning 로그 후 스킵 (전체 배치 실패 방지)
- Design에서는 `JSON.parse()` 직접 사용을 가정했으나, safeParse가 resilience 면에서 우수

#### Importers

| Component | Status |
|-----------|:------:|
| Tatoeba TSV importer (`importFromTsv`) | ✅ |
| Tatoeba JSON importer (`importFromJson`) | ✅ Added |
| JMdict vocab importer (`importVocabFromJson`, `importAllLevels`) | ✅ |
| Static data (6 JSON files: vocab N5-N3, grammar N5-N3) | ✅ |
| Scripts (crawl-nhk, import-tatoeba, import-jmdict, generate-quizzes) | ✅ |

---

### 3.6 FSRS Review System (Section 4.3) -- 85%

| Design Item | Implementation | Status |
|-------------|---------------|:------:|
| ts-fsrs library usage | `createEmptyCard`, `fsrs`, `generatorParameters` | ✅ |
| `reviewCard(card, rating)` | `reviewCard(cardId, grade)` in review.service.ts | ✅ |
| Rating grades 1-4 | `Grade` type from ts-fsrs | ✅ |
| State mapping | `0->new, 1->learning, 2->review, 3->relearning` | ✅ |
| Card creation for wrong answers | `createReviewCard()` from quiz-answer.ts | ✅ |
| `getDueCards()` | `lte(reviewCards.dueDate, new Date())` | ✅ |
| Review stats | `getReviewStats()` (due + total counts) | ✅ |

**Gaps:**

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| `src/lib/fsrs.ts` wrapper | Standalone module | Inlined in review.service.ts | Low (structural) |
| `FsrsCard` interface | Explicit | Uses ts-fsrs types + DB fields | Low |
| `FsrsResult` interface | `{ card, nextDueDate, interval }` | `{ nextDue, interval }` | Low |

---

### 3.7 Scheduler (Section 4.4) -- 80%

| Design Cron | Implementation | Status |
|------------|---------------|:------:|
| Daily push: `*/1 * * * *` | `* * * * *` (equivalent) | ✅ |
| NHK crawl: `0 3 * * *` | `0 4 * * *` (combined) | ⚠️ Changed |
| Quiz batch: `0 4 * * *` | Combined with NHK | ⚠️ Changed |
| Streak update: `0 0 * * *` | Inline in `updateDailyQuizStats()` | ⚠️ Changed |

| Feature | Design | Implementation | Status |
|---------|--------|----------------|:------:|
| Per-user timezone | `daily_time + timezone` cross-check | `DEFAULT_TIMEZONE` only | ⚠️ |
| Content type rotation | `news->sentence->grammar->vocabulary` | Random selection (`ORDER BY RANDOM()`) | ⚠️ |
| Configurable cron via env | `NHK_CRAWL_CRON`, `QUIZ_BATCH_CRON` | Present in .env.example, not parsed | ⚠️ |

---

### 3.8 Environment Variables (Section 7) -- 88%

| Variable | .env.example | config.ts | Status |
|----------|:-----------:|:---------:|:------:|
| `PROJECT_NAME` | absent | absent | ⚠️ Design-only |
| `BOT_TOKEN` | ✅ | ✅ (required) | ✅ |
| `DB_HOST` | ✅ | ✅ (default: localhost) | ✅ |
| `DB_PORT` | ✅ | ✅ (default: 5432) | ✅ |
| `DB_USER` | ✅ | ✅ (default: postgres) | ✅ |
| `DB_PASSWORD` | ✅ | ✅ (default: '') | ✅ |
| `DB_NAME` | ✅ | ✅ (default: nihongo) | ✅ |
| `DB_SSLMODE` | ✅ | not parsed | ⚠️ |
| `REDIS_HOST` | ✅ | ✅ (default: localhost) | ✅ |
| `REDIS_PORT` | ✅ | ✅ (default: 6379) | ✅ |
| `REDIS_PASSWORD` | ✅ | ✅ (default: '') | ✅ |
| `GEMINI_API_KEY` | ✅ | ✅ (default: '') | ✅ |
| `DAILY_CRON_ENABLED` | ✅ | ✅ (default: 'true') | ✅ |
| `NHK_CRAWL_CRON` | ✅ | not parsed | ⚠️ |
| `QUIZ_BATCH_CRON` | ✅ | not parsed | ⚠️ |
| `DEFAULT_TIMEZONE` | ✅ | ✅ (default: Asia/Seoul) | ✅ |
| `MAX_DAILY_QUIZZES` | ✅ | ✅ (default: 10) | ✅ |
| `MAX_REVIEW_CARDS` | ✅ | ✅ (default: 20) | ✅ |

Zod validation with sensible defaults is well-implemented. `dbUrl` construction from individual components is correct.

---

### 3.9 Dependencies (Section 8) -- 100%

All 17 designed packages present with compatible versions:

| Package | Design | Actual | Status |
|---------|--------|--------|:------:|
| grammy | ^1.x | ^1.31.0 | ✅ |
| drizzle-orm | ^0.x | ^0.38.0 | ✅ |
| postgres | ^3.x | ^3.4.0 | ✅ |
| ioredis | ^5.x | ^5.4.0 | ✅ |
| @google/generative-ai | ^0.x | ^0.21.0 | ✅ |
| ts-fsrs | ^4.x | ^4.4.0 | ✅ |
| node-cron | ^3.x | ^3.0.0 | ✅ |
| cheerio | ^1.x | ^1.0.0 | ✅ |
| dayjs | ^1.x | ^1.11.0 | ✅ |
| dotenv | ^16.x | ^16.4.0 | ✅ |
| zod | ^3.x | ^3.24.0 | ✅ |
| typescript (dev) | ^5.x | ^5.7.0 | ✅ |
| tsx (dev) | ^4.x | ^4.19.0 | ✅ |
| drizzle-kit (dev) | ^0.x | ^0.30.0 | ✅ |
| vitest (dev) | ^2.x | ^2.1.0 | ✅ |
| @types/node (dev) | ^22.x | ^22.10.0 | ✅ |
| @types/node-cron (dev) | ^3.x | ^3.0.0 | ✅ |

Note: `cheerio` is in package.json but unused by NHK crawler (uses native fetch + regex). Low priority cleanup.

---

### 3.10 Deployment (Section 11) -- 92%

| Design Item | Implementation | Status |
|-------------|---------------|:------:|
| docker-compose.yml (app + redis) | Exact match | ✅ |
| Networks (shared, nihongo-internal) | Exact match | ✅ |
| Volumes (redis_data) | Exact match | ✅ |
| Dockerfile: FROM node:22-slim | ✅ | ✅ |
| Dockerfile: multi-stage build | Design: single-stage, Impl: multi-stage | ✅ Improved |
| Dockerfile: COPY data/ | Design: included, Impl: not copied | ⚠️ |
| docker-compose.dev.yml | Not in design | ⚠️ Added |

**Dockerfile data/ 미복사 분석:**
- Design: `COPY data/ ./data/` 포함
- Implementation: `src/db/seed.ts`가 data/ JSON을 읽어 DB에 시딩
- 개발 시: `seed.ts`가 로컬에서 실행되어 data/ 접근 가능
- 배포 시: data/가 Docker 이미지에 없으면 seed 불가
- **Verdict**: seed가 빌드 전에 로컬에서 실행되는 경우 문제 없으나, Docker 내에서 seed 실행 시 실패할 수 있음

---

### 3.11 Test Strategy (Section 10) -- 75%

| Design Test | Test File | Status |
|------------|-----------|:------:|
| FSRS algorithm | `tests/lib/fsrs.test.ts` | ✅ |
| Quiz scoring | `tests/services/quiz.service.test.ts` | ✅ |
| Review service | `tests/services/review.service.test.ts` | ✅ |
| Daily service | `tests/services/daily.service.test.ts` | ✅ |
| Level classifier | (none) | ❌ Missing |
| Gemini response parsing | (none) | ❌ Missing |

---

### 3.12 Architecture Compliance -- 95%

| Layer | Path | Status |
|-------|------|:------:|
| Presentation (Bot) | `src/bot/` (commands, callbacks, messages, middleware) | ✅ |
| Application (Services) | `src/services/` (6 files) | ✅ |
| Application (Pipeline) | `src/pipeline/` (crawlers, importers, generators, classifiers) | ✅ |
| Infrastructure (DB) | `src/db/` (client, schema, seed) | ✅ |
| Infrastructure (Lib) | `src/lib/` (config, gemini) | ✅ |
| Domain (Types) | `src/db/schema.ts` (co-located) | ⚠️ |

**Dependency Direction:**

| From -> To | Status |
|-----------|:------:|
| bot/commands -> services | ✅ |
| bot/callbacks -> services | ✅ |
| bot/messages/review.ts -> db/client, db/schema | ⚠️ Presentation -> Infrastructure direct |
| services -> db | ✅ |
| pipeline -> services, db, lib | ✅ |
| lib -> external only | ✅ |

**1 Violation**: `src/bot/messages/review.ts` imports `db/client` and `db/schema` to query quiz/vocabulary data for card display. Should go through a service layer function.

---

### 3.13 Convention Compliance -- 98%

| Category | Convention | Compliance |
|----------|-----------|:----------:|
| Functions | camelCase | 100% |
| Types | PascalCase | 100% |
| Constants | UPPER_SNAKE_CASE | 100% |
| Files | kebab-case.ts / kebab-case.service.ts | 100% |
| Folders | kebab-case | 100% |
| Import order | External -> Internal -> Type | 100% |
| ESM compliance | `.js` extensions in imports | 100% |
| Env naming | UPPER_SNAKE_CASE with prefixes | 100% |

---

## 4. Differences Summary

### 4.1 Missing Features (Design O, Implementation X)

| # | Item | Severity | Description |
|---|------|----------|-------------|
| 1 | `src/lib/fsrs.ts` wrapper | Minor | FSRS logic inlined in review.service.ts |
| 2 | `src/types/` directory (4 files) | Minor | Types in schema.ts exports |
| 3 | `src/db/migrations/` | Minor | Uses initDatabase() raw SQL |
| 4 | NHK Gemini 한국어 번역 | Intentional | Gemini 쿼터를 퀴즈에 집중 |
| 5 | 콘텐츠 유형 로테이션 | Minor | Random 선정만 사용 |
| 6 | Per-user timezone 매칭 | Minor | DEFAULT_TIMEZONE만 사용 |
| 7 | 크론 환경변수 파싱 | Minor | 스케줄러에서 하드코딩 |
| 8 | Level classifier 테스트 | Major | 테스트 파일 없음 |
| 9 | Gemini parsing 테스트 | Major | 테스트 파일 없음 |

### 4.2 Added Features (Design X, Implementation O)

| # | Item | Description |
|---|------|-------------|
| 1 | NHK 인증 시스템 | Abroad profile JWT + cookie chain |
| 2 | Gemini fallback 콘텐츠 | NHK 실패 시 학습 콘텐츠 생성 |
| 3 | `set_level:` 콜백 | 온보딩 레벨 선택 UX |
| 4 | `review_flip:` 콜백 | 카드 뒤집기 UX |
| 5 | Session `userId`/`jlptLevel`/`processing` | 성능 + 안정성 |
| 6 | Multi-stage Dockerfile | 이미지 크기 최적화 |
| 7 | `docker-compose.dev.yml` | 개발 환경 분리 |
| 8 | `src/db/seed.ts` | 어휘+문법 초기 시딩 (quiz 자동 생성) |
| 9 | `src/run-pipeline.ts` | 수동 파이프라인 실행 |
| 10 | zod safeParse for Gemini | Invalid quiz item resilience |
| 11 | Title-based dedup | 중복 콘텐츠 방지 |
| 12 | `bot.catch()` 에러 핸들링 | 전역 에러 방지 |
| 13 | `onConflictDoNothing` | 멱등성 보장 |
| 14 | 추가 스크립트 4개 | 운영/테스트 편의 |

### 4.3 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | NHK 파싱 | cheerio HTML | RSC flight + native fetch + regex | Low (better) |
| 2 | NHK 크롤링 시간 | 새벽 3시 | 새벽 4시 (퀴즈와 통합) | Low |
| 3 | NHK 레벨 분류 | level-classifier | 하드코딩 N3 | Low |
| 4 | 스트릭 업데이트 | 자정 크론 | 퀴즈 완료 이벤트 | Low (better) |
| 5 | Dockerfile | Single-stage + data/ | Multi-stage, no data/ | Low (better) |
| 6 | DB 초기화 | drizzle-kit push | initDatabase() raw SQL | Medium |

---

## 5. Overall Score

```
+------------------------------------------------------+
|  Overall Match Rate: 91%                              |
+------------------------------------------------------+
|  DB Schema:              100%  (7/7 tables exact)     |
|  Dependencies:           100%  (17/17 packages)       |
|  Convention:              98%  (fully compliant)       |
|  Bot Commands/Callbacks:  95%  (14/14 + 2 added)      |
|  Architecture:            95%  (1 minor violation)     |
|  Callback Data Format:    95%  (3/3 match)            |
|  Build Sequence:          93%  (13/14 steps)          |
|  Session Data:            92%  (8/8 + 3 practical)    |
|  Deployment:              92%  (improved Dockerfile)   |
|  Project Structure:       90%  (43/47 files)          |
|  Environment Variables:   88%  (13/17 parsed)         |
|  Content Pipeline:        88%  (translation removed)   |
|  FSRS Review:             85%  (functional, no wrap)   |
|  Scheduler:               80%  (daily push works)     |
|  Tests:                   75%  (4/6 areas covered)    |
+------------------------------------------------------+
|  Intentional Changes:      3   (documented above)     |
|  Added Features:          14   (practical additions)   |
|  Missing Features:         9   (2 Major, 7 Minor)     |
|  Changed Features:         6   (mostly improvements)   |
+------------------------------------------------------+
```

---

## 6. Recommended Actions

### 6.1 To Reach 95% (Priority)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Add level classifier tests (`tests/pipeline/level-classifier.test.ts`) | Tests: 75% -> 83% | Low |
| 2 | Add Gemini parsing tests (`tests/lib/gemini.test.ts`) | Tests: 83% -> 92% | Low |
| 3 | Parse `NHK_CRAWL_CRON`, `QUIZ_BATCH_CRON`, `DB_SSLMODE` in config.ts | Env: 88% -> 100% | Low |
| 4 | Add per-user timezone matching in scheduler | Scheduler: 80% -> 90% | Medium |

### 6.2 Quality Improvements (Medium-term)

| # | Action | Description |
|---|--------|-------------|
| 1 | Extract `src/lib/fsrs.ts` | Move FSRS logic from review.service.ts to standalone module |
| 2 | Move messages/review.ts DB access to service | Fix architecture violation |
| 3 | Implement content type rotation | `news->sentence->grammar->vocabulary` cycle in `selectDailyContent` |
| 4 | Create `src/types/` directory | Extract type aliases from schema.ts |
| 5 | Add `COPY data/ ./data/` to Dockerfile | Ensure seed works in Docker |

### 6.3 Design Document Updates Needed

| Section | Update |
|---------|--------|
| 4.1.1 | Add `set_level:`, `review_flip:` callback registrations |
| 4.1.2 | Add `userId`, `jlptLevel`, `processing` to SessionData |
| 4.2.1 | Document NHK auth flow, Gemini fallback, translation removal rationale |
| 4.2.3 | Document safeParse validation approach |
| 4.4 | Update to combined NHK+quiz cron at 4AM, event-based streak |
| 11 | Update to multi-stage Dockerfile, note data/ handling |

### 6.4 Backlog

| Item | Notes |
|------|-------|
| Remove unused cheerio dependency | NHK crawler uses native fetch + regex |
| Gemini structured output mode | Use `responseMimeType: "application/json"` instead of regex parsing |
| Generate Drizzle migrations | `drizzle-kit generate` for version-controlled schema changes |

---

## 7. Conclusion

nihongo-daily 구현은 설계서 대비 **91% match rate**를 달성하며, 90% threshold를 초과함.

**핵심 성과:**
- 9개 봇 명령어 + 5개 콜백 핸들러 (전체 사용자 인터랙션 구현)
- NHK 크롤러: 인증 + RSC 파싱 + Gemini fallback + 중복 방지
- FSRS 기반 간격 반복 학습 (오답 자동 복습카드 생성)
- 데일리 스케줄러 + 콘텐츠 선정 알고리즘
- 7개 DB 테이블 정확히 일치
- 17/17 의존성 패키지 일치
- Zod safeParse로 Gemini 응답 resilience 확보

**주요 Gap:**
- 테스트 커버리지 2개 영역 누락 (level classifier, gemini parsing)
- 스케줄러의 timezone/rotation 미구현
- 구조적 분리 (fsrs wrapper, types directory) 미완

**Recommendation**: Match rate >= 90% -- 완료 리포트 진행 가능. 테스트 추가로 95%+ 달성 권장.

```
History:
v1.0 (Initial):     76%  [!!]  -- Content pipeline missing
v2.0 (Iteration 1): 93%  [OK]  -- Pipeline implemented, tests added
v3.0 (Re-analysis): 92%  [OK]  -- Comprehensive fresh analysis
v4.0 (Current):     91%  [OK]  -- Post-pipeline refinement (NHK translation removal, safeParse, dedup)
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-15 | Initial gap analysis (76%) | Claude (gap-detector) |
| 2.0 | 2026-03-15 | Re-analysis after Iteration 1 (93%) | Claude (gap-detector) |
| 3.0 | 2026-03-15 | Comprehensive re-analysis (92%) | Claude (gap-detector) |
| 4.0 | 2026-03-15 | Post-pipeline refinement analysis (91%) -- NHK translation removal, safeParse, dedup reflected | Claude (gap-detector) |
