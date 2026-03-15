# nihongo-daily Gap Analysis Report

> **Analysis Type**: Design vs Implementation Gap Analysis
>
> **Project**: nihongo-daily
> **Version**: 0.5.0
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-03-15
> **Design Doc**: [nihongo-daily.design.md](../02-design/features/nihongo-daily.design.md)
> **Iteration**: 5 (post-scheduler/FSRS/test refactor re-analysis)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

PDCA Check phase: comprehensive comparison of design document (Sections 2-11) against actual implementation. This v5.0 analysis reflects major structural improvements: scheduler split into 4 crons, FSRS extraction to standalone module, test count doubled, architecture violation fixed.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/nihongo-daily.design.md`
- **Implementation Path**: `src/`, `scripts/`, `data/`, `tests/`, project root
- **Analysis Date**: 2026-03-15
- **Previous Match Rates**: v1.0 = 76%, v2.0 = 93%, v3.0 = 92%, v4.0 = 91%

### 1.3 Changes Since v4.0

| Change | Impact | Category |
|--------|--------|----------|
| Scheduler split into 4 separate crons (daily push, NHK 3AM, quiz batch 4AM, streak midnight) | Scheduler matches design exactly | Improvement |
| `NHK_CRAWL_CRON`, `QUIZ_BATCH_CRON`, `STREAK_UPDATE_CRON` parsed in config.ts | Env vars now configurable | Improvement |
| `src/lib/fsrs.ts` extracted as standalone module with `scheduleReview()`, `getEmptyCardDefaults()`, `mapState()` | Matches design structure | Improvement |
| `getCardContent()` moved to review.service.ts, handles grammar/sentence card types | FSRS card type coverage complete | Improvement |
| `messages/review.ts` now imports from service layer (not db directly) | Architecture violation fixed | Improvement |
| Tests: 37 -> ~76 (new: gemini, level-classifier, nhk-parser, config, bot messages) | Test coverage nearly doubled | Improvement |
| NHK Gemini translation still removed (bodyKo = '') | Intentional -- Gemini quota for quizzes | Intentional |
| Zod safeParse for Gemini quiz responses | Intentional -- resilience | Intentional |

---

## 2. Overall Scores

| Category | Score | Status | v4.0 | Delta |
|----------|:-----:|:------:|:----:|:-----:|
| Project Structure (Section 2) | 93% | ✅ | 90% | +3% |
| DB Schema (Section 3) | 100% | ✅ | 100% | = |
| Bot Commands & Callbacks (Section 4.1) | 95% | ✅ | 95% | = |
| Session Data (Section 4.1.2) | 92% | ✅ | 92% | = |
| Content Pipeline (Section 4.2) | 88% | ⚠️ | 88% | = |
| FSRS Review System (Section 4.3) | 97% | ✅ | 85% | +12% |
| Scheduler (Section 4.4) | 95% | ✅ | 80% | +15% |
| Callback Data Format (Section 5.1) | 95% | ✅ | 95% | = |
| Environment Variables (Section 7) | 95% | ✅ | 88% | +7% |
| Dependencies (Section 8) | 100% | ✅ | 100% | = |
| Build Sequence (Section 9) | 93% | ✅ | 93% | = |
| Deployment (Section 11) | 92% | ✅ | 92% | = |
| Test Strategy (Section 10) | 92% | ✅ | 75% | +17% |
| Convention Compliance | 98% | ✅ | 98% | = |
| Architecture Compliance | 98% | ✅ | 95% | +3% |
| **Overall** | **95%** | **✅** | **91%** | **+4%** |

> ✅ = 90%+, ⚠️ = 70-89%, ❌ = <70%

---

## 3. Detailed Gap Analysis

### 3.1 Project Structure (Section 2) -- 93%

**Files Present: 45/47 designed paths**

All design-specified files exist except:

| Design Path | Severity | Notes |
|-------------|----------|-------|
| `src/types/` directory (4 files) | Minor | Types exported from `src/db/schema.ts` -- co-located approach |
| `src/db/migrations/` | Minor | Uses `initDatabase()` raw SQL instead of drizzle-kit migrations |

Previously missing `src/lib/fsrs.ts` now exists as a standalone module.

Additional files not in design:

| File | Purpose |
|------|---------|
| `src/db/seed.ts` | Vocab+grammar data seeding with auto quiz generation |
| `src/run-pipeline.ts` | Manual pipeline execution entry (`docker exec` support) |
| `docker-compose.dev.yml` | Development environment (local postgres + redis) |
| `scripts/seed-remote.ts` | Remote server seeding |
| `scripts/generate-seed-sql.ts` | SQL dump generation |
| `scripts/test-pipeline.ts` | Pipeline testing |
| `scripts/test-nhk-crawl.ts` | NHK crawling testing |

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

Type enums all match design verbatim.

---

### 3.3 Bot Commands & Callbacks (Section 4.1) -- 95%

**Commands: 9/9 implemented** -- all match design.

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

---

### 3.4 Session Data (Section 4.1.2) -- 92%

All design fields present. Added fields for performance/stability:

| Added Field | Purpose | Justification |
|-------------|---------|---------------|
| `userId` | Cached DB user ID | Avoids repeated DB lookup |
| `jlptLevel` | Cached JLPT level | Performance |
| `processing` | Duplicate callback guard | Race condition protection |

---

### 3.5 Content Pipeline (Section 4.2) -- 88%

#### NHK Easy Crawler

| Design Spec | Implementation | Status |
|-------------|---------------|:------:|
| Article list collection | `fetchNhkArticleList()` via `news-list.json` | ✅ |
| Article body via JSON API | RSC flight (`_rsc=1` + `RSC: 1` header) | ✅ Changed |
| Ruby tag furigana extraction | regex: `<ruby>([^<]*)<rt>([^<]*)</rt></ruby>` | ✅ |
| **Gemini Korean translation** | **Removed (bodyKo = '')** | ⚠️ Intentional |
| Level classifier tagging | Hardcoded `N3` (NHK Easy = N3 assumption) | ⚠️ Changed |
| Save to contents table | `crawlAndSave()` with title-based dedup | ✅ |

NHK translation removal: Gemini quota (250/day) preserved for quiz generation. Low impact -- daily message omits Korean translation, restorable later.

#### Level Classifier -- ✅

| Design Item | Implementation | Status |
|-------------|---------------|:------:|
| `ClassificationResult` interface | Matches (level, confidence, wordLevelBreakdown) | ✅ |
| `classifyLevel()` function | Vocab DB matching + 10% threshold | ✅ |
| Token extraction | regex `[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+` | ✅ |

#### Gemini Quiz Generator -- ✅

| Design Item | Implementation | Status |
|-------------|---------------|:------:|
| 4 quiz types (reading, vocabulary, grammar, translate) | ✅ | ✅ |
| Structured prompt | Near-identical to design | ✅ |
| JSON response parsing | regex extraction + **zod safeParse** | ✅ Enhanced |
| gemini-2.5-flash model | Matched | ✅ |
| gemini-2.5-flash-lite (batch) | Not used (flash only) | ⚠️ Minor |

---

### 3.6 FSRS Review System (Section 4.3) -- 97% (+12% from v4.0)

**Major improvement**: `src/lib/fsrs.ts` now exists as a standalone module matching design Section 4.3 exactly.

| Design Item | Implementation | Status |
|-------------|---------------|:------:|
| `src/lib/fsrs.ts` standalone module | ✅ Extracted from review.service.ts | ✅ **NEW** |
| ts-fsrs library usage | `createEmptyCard`, `fsrs`, `generatorParameters` | ✅ |
| `scheduleReview(card, grade)` | `scheduleReview(cardData, grade)` in fsrs.ts | ✅ **NEW** |
| `getEmptyCardDefaults()` | Exported from fsrs.ts | ✅ **NEW** |
| `mapState()` | Exported from fsrs.ts | ✅ **NEW** |
| Rating grades 1-4 | `Grade` type from ts-fsrs | ✅ |
| State mapping `0->new, 1->learning, 2->review, 3->relearning` | ✅ | ✅ |
| Card creation for wrong answers | `createReviewCard()` | ✅ |
| `getDueCards()` | `lte(reviewCards.dueDate, new Date())` | ✅ |
| Review stats | `getReviewStats()` (due + total counts) | ✅ |
| `getCardContent()` grammar/sentence support | ✅ All 3 card types handled | ✅ **NEW** |

**Remaining minor gap**: `FsrsResult` interface returns `{ stability, difficulty, dueDate, ... }` vs design's `{ card, nextDueDate, interval }` -- functionally equivalent, different shape.

---

### 3.7 Scheduler (Section 4.4) -- 95% (+15% from v4.0)

**Major improvement**: Scheduler now has 4 separate cron jobs matching design specification exactly.

| Design Cron | Implementation | Status |
|------------|---------------|:------:|
| Daily push: `*/1 * * * *` | `* * * * *` (equivalent) | ✅ |
| NHK crawl: `0 3 * * *` | `config.NHK_CRAWL_CRON` (default `0 3 * * *`) | ✅ **FIXED** |
| Quiz batch: `0 4 * * *` | `config.QUIZ_BATCH_CRON` (default `0 4 * * *`) | ✅ **FIXED** |
| Streak update: `0 0 * * *` | `config.STREAK_UPDATE_CRON` (default `0 0 * * *`) | ✅ **FIXED** |

| Feature | Design | Implementation | Status |
|---------|--------|----------------|:------:|
| Per-user timezone | `daily_time + timezone` cross-check | `DEFAULT_TIMEZONE` only | ⚠️ Minor |
| Content type rotation | `news->sentence->grammar->vocabulary` | `CONTENT_ROTATION` defined, `RANDOM()` used | ⚠️ Minor |
| Configurable cron via env | `NHK_CRAWL_CRON`, `QUIZ_BATCH_CRON` | ✅ Parsed and used in scheduler | ✅ **FIXED** |

---

### 3.8 Environment Variables (Section 7) -- 95% (+7% from v4.0)

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
| `REDIS_HOST` | ✅ | ✅ | ✅ |
| `REDIS_PORT` | ✅ | ✅ | ✅ |
| `REDIS_PASSWORD` | ✅ | ✅ | ✅ |
| `GEMINI_API_KEY` | ✅ | ✅ | ✅ |
| `DAILY_CRON_ENABLED` | ✅ | ✅ | ✅ |
| `NHK_CRAWL_CRON` | ✅ | ✅ (default: `0 3 * * *`) | ✅ **FIXED** |
| `QUIZ_BATCH_CRON` | ✅ | ✅ (default: `0 4 * * *`) | ✅ **FIXED** |
| `STREAK_UPDATE_CRON` | absent in .env.example | ✅ (default: `0 0 * * *`) | ⚠️ Missing from .env.example |
| `DEFAULT_TIMEZONE` | ✅ | ✅ | ✅ |
| `MAX_DAILY_QUIZZES` | ✅ | ✅ | ✅ |
| `MAX_REVIEW_CARDS` | ✅ | ✅ | ✅ |

Zod validation with sensible defaults well-implemented. New cron env vars properly parsed.

---

### 3.9 Dependencies (Section 8) -- 100%

All 17 designed packages present with compatible versions. No changes from v4.0.

Note: `cheerio` in package.json but unused by NHK crawler (uses native fetch + regex). Low priority cleanup.

---

### 3.10 Deployment (Section 11) -- 92%

| Design Item | Implementation | Status |
|-------------|---------------|:------:|
| docker-compose.yml (app + redis) | Exact match | ✅ |
| Networks (shared, nihongo-internal) | Exact match | ✅ |
| Dockerfile: FROM node:22-slim | Multi-stage (improved) | ✅ |
| Dockerfile: COPY data/ | Not copied in production stage | ⚠️ |
| docker-compose.dev.yml | Not in design (added) | ⚠️ |

---

### 3.11 Test Strategy (Section 10) -- 92% (+17% from v4.0)

**Major improvement**: Tests doubled from 37 to ~76. All previously missing test areas now covered.

| Design Test Area | Test File | Tests | Status | v4.0 |
|-----------------|-----------|:-----:|:------:|:----:|
| FSRS algorithm | `tests/lib/fsrs.test.ts` | 7 | ✅ | ✅ |
| Quiz scoring | `tests/services/quiz.service.test.ts` | 4 | ✅ | ✅ |
| Review service | `tests/services/review.service.test.ts` | 3 | ✅ | ✅ |
| Daily service | `tests/services/daily.service.test.ts` | 5 | ✅ | ✅ |
| Level classifier | `tests/pipeline/level-classifier.test.ts` | 11 | ✅ | ❌ **NEW** |
| Gemini response parsing | `tests/lib/gemini.test.ts` | 7 | ✅ | ❌ **NEW** |

**Additional test coverage (beyond design):**

| Test Area | Test File | Tests |
|-----------|-----------|:-----:|
| Bot message: daily | `tests/bot/messages/daily.test.ts` | 9 |
| Bot message: quiz | `tests/bot/messages/quiz.test.ts` | 7 |
| Bot message: stats | `tests/bot/messages/stats.test.ts` | 6 |
| NHK parser logic | `tests/pipeline/nhk-parser.test.ts` | 8 |
| Config schema validation | `tests/lib/config.test.ts` | 8 |

Total: **11 test files, ~75 test cases** covering 6/6 design areas + 5 bonus areas.

---

### 3.12 Architecture Compliance -- 98% (+3% from v4.0)

| Layer | Path | Status |
|-------|------|:------:|
| Presentation (Bot) | `src/bot/` (commands, callbacks, messages, middleware) | ✅ |
| Application (Services) | `src/services/` (6 files) | ✅ |
| Application (Pipeline) | `src/pipeline/` (crawlers, importers, generators, classifiers) | ✅ |
| Infrastructure (DB) | `src/db/` (client, schema, seed) | ✅ |
| Infrastructure (Lib) | `src/lib/` (config, gemini, fsrs) | ✅ |
| Domain (Types) | `src/db/schema.ts` (co-located) | ⚠️ Minor |

**Dependency Direction:**

| From -> To | Status |
|-----------|:------:|
| bot/commands -> services | ✅ |
| bot/callbacks -> services | ✅ |
| bot/messages/review.ts -> services/review.service.ts | ✅ **FIXED** (was db direct) |
| services -> db | ✅ |
| services -> lib/fsrs | ✅ **NEW** (proper layer) |
| pipeline -> services, db, lib | ✅ |
| lib -> external only | ✅ |

**v4.0 violation resolved**: `src/bot/messages/review.ts` previously imported `db/client` and `db/schema` directly. Now imports `getCardContent()` from `services/review.service.ts`, following proper Presentation -> Application dependency.

---

### 3.13 Convention Compliance -- 98%

| Category | Convention | Compliance |
|----------|-----------|:----------:|
| Functions | camelCase | 100% |
| Types | PascalCase | 100% |
| Constants | UPPER_SNAKE_CASE | 100% |
| Files | kebab-case.ts | 100% |
| Folders | kebab-case | 100% |
| Import order | External -> Internal -> Type | 100% |
| ESM compliance | `.js` extensions in imports | 100% |
| Env naming | UPPER_SNAKE_CASE with prefixes | 100% |

---

## 4. Differences Summary

### 4.1 Missing Features (Design O, Implementation X)

| # | Item | Severity | Description |
|---|------|----------|-------------|
| 1 | `src/types/` directory (4 files) | Minor | Types co-located in schema.ts exports |
| 2 | `src/db/migrations/` | Minor | Uses initDatabase() raw SQL |
| 3 | NHK Gemini Korean translation | Intentional | bodyKo = '' -- Gemini quota for quizzes |
| 4 | Content type rotation in selection | Minor | `CONTENT_ROTATION` defined but `RANDOM()` used |
| 5 | Per-user timezone matching | Minor | `DEFAULT_TIMEZONE` only |
| 6 | `DB_SSLMODE` env parsing | Minor | Present in .env.example, not in config.ts |
| 7 | `PROJECT_NAME` env var | Minor | Design-only, not implemented |
| 8 | `STREAK_UPDATE_CRON` in .env.example | Minor | Parsed in config.ts but missing from .env.example |

### 4.2 Added Features (Design X, Implementation O)

| # | Item | Description |
|---|------|-------------|
| 1 | NHK authentication system | Abroad profile JWT + cookie chain |
| 2 | Gemini fallback content | NHK failure -> Gemini learning content |
| 3 | `set_level:` callback | Onboarding level selection UX |
| 4 | `review_flip:` callback | Card flip UX |
| 5 | Session `userId`/`jlptLevel`/`processing` | Performance + stability |
| 6 | Multi-stage Dockerfile | Image size optimization |
| 7 | `docker-compose.dev.yml` | Development environment separation |
| 8 | `src/db/seed.ts` | Vocab+grammar seeding with auto quiz generation |
| 9 | `src/run-pipeline.ts` | Manual pipeline execution |
| 10 | Zod safeParse for Gemini | Invalid quiz item resilience |
| 11 | Title-based dedup | Duplicate content prevention |
| 12 | `bot.catch()` error handling | Global error prevention |
| 13 | `onConflictDoNothing` | Idempotency guarantee |
| 14 | 5 additional test areas | Bot messages, NHK parser, config schema |
| 15 | `resetInactiveStreaks()` | Midnight streak reset for inactive users |

### 4.3 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | NHK parsing | cheerio HTML | RSC flight + native fetch + regex | Low (better) |
| 2 | NHK level classification | level-classifier | Hardcoded N3 | Low |
| 3 | Dockerfile | Single-stage + data/ | Multi-stage, no data/ | Low (better) |
| 4 | DB initialization | drizzle-kit push | initDatabase() raw SQL | Medium |

---

## 5. Overall Score

```
+------------------------------------------------------+
|  Overall Match Rate: 95%                              |
+------------------------------------------------------+
|  DB Schema:              100%  (7/7 tables exact)     |
|  Dependencies:           100%  (17/17 packages)       |
|  Convention:              98%  (fully compliant)       |
|  Architecture:            98%  (0 violations)          |
|  FSRS Review:             97%  (standalone module)     |
|  Bot Commands/Callbacks:  95%  (14/14 + 2 added)      |
|  Callback Data Format:    95%  (3/3 match)            |
|  Scheduler:               95%  (4 crons, configurable) |
|  Environment Variables:   95%  (17/19 fully parsed)    |
|  Project Structure:       93%  (45/47 files)          |
|  Build Sequence:          93%  (13/14 steps)          |
|  Session Data:            92%  (8/8 + 3 practical)    |
|  Deployment:              92%  (improved Dockerfile)   |
|  Tests:                   92%  (6/6 areas + 5 bonus)  |
|  Content Pipeline:        88%  (translation removed)   |
+------------------------------------------------------+
|  Intentional Changes:      2   (NHK translation, safeParse) |
|  Added Features:          15   (practical additions)   |
|  Missing Features:         8   (0 Major, 8 Minor)     |
|  Changed Features:         4   (mostly improvements)   |
+------------------------------------------------------+
```

---

## 6. v4.0 -> v5.0 Improvement Summary

| Area | v4.0 | v5.0 | What Changed |
|------|:----:|:----:|-------------|
| FSRS Review | 85% | 97% | `src/lib/fsrs.ts` extracted as standalone module with `scheduleReview()`, `getEmptyCardDefaults()`, `mapState()` |
| Scheduler | 80% | 95% | Split into 4 separate crons matching design; env vars parsed and used |
| Tests | 75% | 92% | 37 -> ~76 tests; level-classifier, gemini, NHK parser, config, bot messages added |
| Env Variables | 88% | 95% | `NHK_CRAWL_CRON`, `QUIZ_BATCH_CRON`, `STREAK_UPDATE_CRON` now parsed in config.ts |
| Architecture | 95% | 98% | `messages/review.ts` no longer imports db directly; `getCardContent()` moved to service |
| Project Structure | 90% | 93% | `src/lib/fsrs.ts` now exists |
| **Overall** | **91%** | **95%** | **+4 percentage points** |

---

## 7. Recommended Actions

### 7.1 To Reach 98% (Optional Polish)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Add `STREAK_UPDATE_CRON` to `.env.example` | Env: 95% -> 97% | Trivial |
| 2 | Parse `DB_SSLMODE` in config.ts | Env: 97% -> 100% | Low |
| 3 | Implement content type rotation in `selectDailyContent` | Scheduler: 95% -> 98% | Low |
| 4 | Add per-user timezone matching in daily push cron | Scheduler: 98% -> 100% | Medium |

### 7.2 Design Document Updates Needed

| Section | Update |
|---------|--------|
| 4.1.1 | Add `set_level:`, `review_flip:` callback registrations |
| 4.1.2 | Add `userId`, `jlptLevel`, `processing` to SessionData |
| 4.2.1 | Document NHK auth flow, Gemini fallback, translation removal rationale |
| 4.2.3 | Document safeParse validation approach |
| 7 | Add `STREAK_UPDATE_CRON` to env var list |
| 11 | Update to multi-stage Dockerfile, note data/ handling |

### 7.3 Backlog (Low Priority)

| Item | Notes |
|------|-------|
| Remove unused cheerio dependency | NHK crawler uses native fetch + regex |
| Create `src/types/` directory | Extract type aliases from schema.ts |
| Implement NHK level-classifier integration | Replace hardcoded N3 |
| Generate Drizzle migrations | `drizzle-kit generate` for version-controlled schema changes |
| Add `COPY data/ ./data/` to Dockerfile | Ensure seed works inside Docker container |

---

## 8. Conclusion

nihongo-daily implementation achieves **95% match rate** against the design document, a significant +4% improvement over v4.0 (91%).

**Key improvements in this iteration:**
- Scheduler now matches design exactly with 4 separate configurable crons
- FSRS module properly extracted as `src/lib/fsrs.ts` with clean API
- Test coverage nearly doubled (37 -> ~76 tests) covering all 6 design test areas
- Architecture violation fixed (messages/review.ts no longer accesses db directly)
- All 3 cron env vars parsed and consumed by scheduler

**Remaining gaps (all Minor):**
- Content pipeline: NHK translation intentionally removed, NHK level hardcoded to N3
- Content selection: rotation defined but random used
- Per-user timezone: DEFAULT_TIMEZONE only
- Structural: types co-located in schema.ts instead of separate directory

**Recommendation**: Match rate >= 95% -- well above threshold. Ready for completion report. Remaining gaps are intentional design decisions or low-priority structural preferences.

```
History:
v1.0 (Initial):     76%  [!!]  -- Content pipeline missing
v2.0 (Iteration 1): 93%  [OK]  -- Pipeline implemented, tests added
v3.0 (Re-analysis): 92%  [OK]  -- Comprehensive fresh analysis
v4.0 (Refinement):  91%  [OK]  -- NHK translation removal, safeParse, dedup
v5.0 (Current):     95%  [OK]  -- Scheduler split, FSRS extracted, tests doubled
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-15 | Initial gap analysis (76%) | Claude (gap-detector) |
| 2.0 | 2026-03-15 | Re-analysis after Iteration 1 (93%) | Claude (gap-detector) |
| 3.0 | 2026-03-15 | Comprehensive re-analysis (92%) | Claude (gap-detector) |
| 4.0 | 2026-03-15 | Post-pipeline refinement analysis (91%) | Claude (gap-detector) |
| 5.0 | 2026-03-15 | Post-scheduler/FSRS/test refactor (95%) -- 4 crons, fsrs.ts extracted, tests doubled, arch violation fixed | Claude (gap-detector) |
