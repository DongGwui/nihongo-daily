# nihongo-web-dashboard 설계서 (Design Document)

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | nihongo-web-dashboard (웹 학습 대시보드) |
| Plan 참조 | `docs/01-plan/features/nihongo-web-dashboard.plan.md` |
| 작성일 | 2026-03-15 |
| Phase 1 참조 | `docs/02-design/features/nihongo-daily.design.md` |
| MVP 범위 | 인증 + 대시보드 + 통계 + 검색 + 레벨테스트 (2-3주) |
| 인프라 | 홈서버 Docker + Cloudflare Tunnel |
| 도메인 | `nihongo.dltmxm.link` |

### 1.1 설계 범위

- Next.js 15 App Router 기반 웹 대시보드
- Telegram Login Widget 인증
- 학습 캘린더 (잔디 히트맵)
- 통계 대시보드 (차트)
- 콘텐츠 검색/아카이브
- JLPT 레벨 배치 테스트

### 1.2 설계 제외 범위

- LINE Bot 연동
- AI 작문 퀴즈 + 자동 채점
- 소셜 기능 (랭킹, 스터디 그룹)
- 모바일 앱 (React Native)

---

## 2. 프로젝트 구조

```
web/                              # Next.js 앱 (monorepo 내 별도 디렉토리)
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── Dockerfile
├── .env.local                    # 개발용 환경변수
│
├── app/
│   ├── layout.tsx                # 루트 레이아웃 (폰트, 메타데이터, 글로벌 Provider)
│   ├── page.tsx                  # 랜딩/로그인 페이지
│   ├── globals.css               # Tailwind + shadcn/ui CSS
│   │
│   ├── dashboard/
│   │   ├── layout.tsx            # 대시보드 레이아웃 (사이드바/헤더 + AuthGuard)
│   │   ├── page.tsx              # 메인 대시보드 (캘린더 + 요약)
│   │   ├── stats/
│   │   │   └── page.tsx          # 상세 통계
│   │   ├── search/
│   │   │   └── page.tsx          # 콘텐츠 검색
│   │   └── level-test/
│   │       └── page.tsx          # 레벨 테스트
│   │
│   └── api/
│       ├── auth/
│       │   └── telegram/route.ts # Telegram Login 검증 + JWT 발급
│       ├── me/route.ts           # 현재 사용자 정보
│       ├── calendar/route.ts     # 캘린더 히트맵 데이터
│       ├── stats/route.ts        # 통계 데이터
│       ├── contents/route.ts     # 콘텐츠 검색
│       ├── contents/[id]/route.ts # 콘텐츠 상세
│       └── level-test/
│           ├── start/route.ts    # 테스트 시작 (문항 생성)
│           └── submit/route.ts   # 테스트 제출 (결과 산출)
│
├── components/
│   ├── ui/                       # shadcn/ui 컴포넌트 (Button, Card, Input 등)
│   ├── layout/
│   │   ├── header.tsx            # 상단 헤더 (로고 + 네비게이션 + 유저)
│   │   ├── sidebar.tsx           # 사이드바 네비게이션
│   │   └── auth-guard.tsx        # 인증 보호 컴포넌트
│   ├── dashboard/
│   │   ├── calendar-heatmap.tsx  # 잔디 히트맵
│   │   ├── summary-cards.tsx     # 요약 카드 (학습일, 스트릭, 정답률)
│   │   └── today-summary.tsx     # 오늘의 학습 요약
│   ├── stats/
│   │   ├── accuracy-chart.tsx    # 정답률 추이 라인 차트
│   │   ├── quiz-type-radar.tsx   # 퀴즈 유형별 레이더 차트
│   │   └── level-distribution.tsx # JLPT 레벨 분포 도넛 차트
│   ├── search/
│   │   ├── search-filters.tsx    # 필터 UI (레벨, 유형, 키워드)
│   │   ├── content-card.tsx      # 검색 결과 카드
│   │   └── content-detail.tsx    # 콘텐츠 상세 (후리가나 + 번역)
│   └── level-test/
│       ├── test-progress.tsx     # 진행률 바
│       ├── question-card.tsx     # 문항 카드
│       └── result-card.tsx       # 결과 카드 (추천 레벨)
│
└── lib/
    ├── db.ts                     # Drizzle 클라이언트 (Phase 1 schema import)
    ├── auth.ts                   # Telegram HMAC 검증 + JWT 유틸
    ├── session.ts                # 쿠키 기반 세션 관리
    └── queries/
        ├── calendar.ts           # 캘린더 데이터 쿼리
        ├── stats.ts              # 통계 쿼리
        ├── contents.ts           # 콘텐츠 검색 쿼리
        └── level-test.ts         # 레벨 테스트 쿼리
```

---

## 3. DB 스키마

### 3.1 기존 테이블 (Phase 1 — 변경 없음)

Phase 1의 7개 테이블을 **읽기 전용으로 공유**:

| 테이블 | 웹에서 활용 | 비고 |
|--------|------------|------|
| `users` | 인증 (telegram_id로 조회), 레벨/스트릭 표시 | jlpt_level 업데이트 (레벨 테스트) |
| `contents` | 콘텐츠 검색, 상세 보기 | 읽기 전용 |
| `vocabularies` | 콘텐츠 상세에서 단어 표시 | 읽기 전용 |
| `quizzes` | 레벨 테스트 문항 출제 | 읽기 전용 |
| `user_quiz_results` | 정답률 통계, 퀴즈 유형별 성과 | 읽기 전용 |
| `review_cards` | 복습 예정 카드 수 표시 | 읽기 전용 |
| `daily_logs` | 캘린더 히트맵, 학습 기록 | 읽기 전용 |

### 3.2 신규 테이블

```sql
-- 레벨 테스트 결과 기록
CREATE TABLE level_test_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  recommended_level VARCHAR(2) NOT NULL,        -- 추천 JLPT 레벨
  scores JSONB NOT NULL,                        -- {"N5": 90, "N4": 75, "N3": 40, ...}
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  taken_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_level_test_user ON level_test_results(user_id);
```

### 3.3 Drizzle 스키마 추가 (web/lib/db.ts)

```typescript
// Phase 1 스키마 재사용
import {
  users, contents, vocabularies, quizzes,
  userQuizResults, reviewCards, dailyLogs,
} from '../../src/db/schema.js';

// 웹 전용 신규 테이블
export const levelTestResults = pgTable('level_test_results', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  recommendedLevel: varchar('recommended_level', { length: 2 }).notNull(),
  scores: jsonb('scores').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  correctCount: integer('correct_count').notNull(),
  takenAt: timestamp('taken_at').notNull().defaultNow(),
}, (table) => [
  index('idx_level_test_user').on(table.userId),
]);

// Phase 1 스키마 re-export
export {
  users, contents, vocabularies, quizzes,
  userQuizResults, reviewCards, dailyLogs,
};
```

---

## 4. API 설계

### 4.1 인증 API

#### `POST /api/auth/telegram`

Telegram Login Widget 데이터를 검증하고 JWT 세션 발급.

**Request:**
```json
{
  "id": 123456789,
  "first_name": "User",
  "username": "testuser",
  "photo_url": "https://...",
  "auth_date": 1710500000,
  "hash": "abc123..."
}
```

**검증 로직:**
```
1. BOT_TOKEN의 SHA-256 해시로 secret_key 생성
2. data-check-string = 정렬된 key=value 쌍 (hash 제외)
3. HMAC-SHA256(data-check-string, secret_key) === hash
4. auth_date가 86400초(24시간) 이내인지 확인
5. telegram_id로 users 테이블 조회
6. 미등록 → 401 "봇에서 /start를 먼저 실행하세요"
7. 등록 → JWT 발급 (httpOnly cookie, 7일 만료)
```

**Response (성공):**
```json
{
  "user": {
    "id": 1,
    "telegramId": "123456789",
    "username": "testuser",
    "jlptLevel": "N3",
    "streakCount": 15
  }
}
```

**Response (미등록):**
```json
{ "error": "NOT_REGISTERED", "message": "Telegram 봇에서 /start를 먼저 실행해주세요." }
```

#### `GET /api/me`

현재 로그인 사용자 정보 조회 (JWT 쿠키 기반).

**Response:**
```json
{
  "id": 1,
  "username": "testuser",
  "jlptLevel": "N3",
  "streakCount": 15,
  "isActive": true,
  "reviewDueCount": 5
}
```

---

### 4.2 캘린더 API

#### `GET /api/calendar?months=6`

최근 N개월 학습 히트맵 데이터.

**Query:**
```sql
SELECT date, quizzes_completed, correct_count, total_count, study_minutes
FROM daily_logs
WHERE user_id = :userId AND date >= :sinceDate
ORDER BY date ASC;
```

**Response:**
```json
{
  "data": [
    { "date": "2026-01-15", "count": 3, "level": 2 },
    { "date": "2026-01-16", "count": 8, "level": 4 }
  ],
  "summary": {
    "totalDays": 45,
    "currentStreak": 15,
    "longestStreak": 22,
    "totalQuizzes": 340
  }
}
```

**level 산출 기준:**
| total_count | level | 색상 |
|-------------|-------|------|
| 0 | 0 | 빈칸 (배경색) |
| 1-2 | 1 | 연한 초록 |
| 3-5 | 2 | 초록 |
| 6-9 | 3 | 진한 초록 |
| 10+ | 4 | 가장 진한 초록 |

---

### 4.3 통계 API

#### `GET /api/stats?period=week|month|all`

**Response:**
```json
{
  "accuracy": {
    "labels": ["03/09", "03/10", "03/11", ...],
    "correct": [5, 8, 3, ...],
    "total": [6, 10, 5, ...]
  },
  "quizTypes": {
    "vocabulary": { "correct": 120, "total": 150 },
    "reading": { "correct": 95, "total": 130 },
    "grammar": { "correct": 40, "total": 55 },
    "translate": { "correct": 30, "total": 42 }
  },
  "levelDistribution": {
    "N5": 45,
    "N4": 38,
    "N3": 52,
    "N2": 15,
    "N1": 3
  },
  "streakHistory": {
    "current": 15,
    "longest": 22,
    "monthlyStudyDays": [18, 22, 15]
  }
}
```

**쿼리 전략:**
- `accuracy`: `user_quiz_results` GROUP BY date, period에 따라 집계
- `quizTypes`: `user_quiz_results` JOIN `quizzes` GROUP BY quiz type
- `levelDistribution`: `daily_logs` JOIN `contents` GROUP BY jlpt_level
- `streakHistory`: `daily_logs` + `users.streak_count`

---

### 4.4 콘텐츠 검색 API

#### `GET /api/contents?level=N3&type=grammar&q=ために&page=1&limit=20`

**Query:**
```sql
SELECT c.id, c.type, c.jlpt_level, c.title, c.body_ja, c.body_ko, c.source,
       EXISTS(SELECT 1 FROM daily_logs dl WHERE dl.content_id = c.id AND dl.user_id = :userId) as studied
FROM contents c
WHERE (:level IS NULL OR c.jlpt_level = :level)
  AND (:type IS NULL OR c.type = :type)
  AND (:q IS NULL OR c.body_ja ILIKE '%' || :q || '%' OR c.title ILIKE '%' || :q || '%')
ORDER BY c.created_at DESC
LIMIT :limit OFFSET :offset;
```

**Response:**
```json
{
  "items": [
    {
      "id": 42,
      "type": "grammar",
      "jlptLevel": "N3",
      "title": "〜ために",
      "bodyJa": "日本語を勉強するために...",
      "bodyKo": "일본어를 공부하기 위해...",
      "studied": true
    }
  ],
  "total": 156,
  "page": 1,
  "totalPages": 8
}
```

#### `GET /api/contents/:id`

**Response:** 콘텐츠 상세 + 관련 퀴즈 + 단어 목록

```json
{
  "content": { "id": 42, "type": "grammar", "bodyJa": "...", "bodyReading": "...", "bodyKo": "..." },
  "quizzes": [{ "id": 1, "type": "grammar", "question": "...", "options": [...] }],
  "vocabularies": [{ "word": "勉強", "reading": "べんきょう", "meaningKo": "공부" }]
}
```

---

### 4.5 레벨 테스트 API

#### `POST /api/level-test/start`

적응형 레벨 테스트 시작. DB에서 레벨별 퀴즈를 균형 출제.

**출제 알고리즘:**
```
1. 초기 레벨: 사용자 현재 레벨 (예: N4)
2. 총 25문항, 5레벨 x 5문항 기본 배분
3. 정답 → 다음 문항 난이도 UP, 오답 → DOWN
4. 각 레벨 DB에서 랜덤 선택 (ORDER BY RANDOM() LIMIT N)
5. 사용자가 이전에 풀지 않은 문제 우선
```

**Response:**
```json
{
  "testId": "uuid-...",
  "questions": [
    {
      "index": 1,
      "level": "N4",
      "quizId": 123,
      "type": "vocabulary",
      "question": "「食べる」의 뜻은?",
      "options": ["먹다", "마시다", "자다", "놀다"]
    }
  ],
  "totalQuestions": 25
}
```

#### `POST /api/level-test/submit`

**Request:**
```json
{
  "testId": "uuid-...",
  "answers": [
    { "quizId": 123, "answer": "먹다" },
    { "quizId": 456, "answer": "..." }
  ]
}
```

**채점 로직:**
```
1. 레벨별 정답률 계산
2. 정답률 70% 이상인 최고 레벨 → 추천 레벨
3. level_test_results 테이블에 기록
4. 사용자 동의 시 users.jlpt_level 업데이트
```

**Response:**
```json
{
  "recommendedLevel": "N3",
  "scores": { "N5": 100, "N4": 85, "N3": 70, "N2": 35, "N1": 10 },
  "totalCorrect": 18,
  "totalQuestions": 25,
  "applyUrl": "/api/level-test/apply"
}
```

---

## 5. 인증 설계

### 5.1 흐름

```
[웹 브라우저]                    [서버 (Next.js)]              [Telegram]
     │                              │                           │
     │  1. 로그인 페이지 방문         │                           │
     │  2. Telegram Login Widget 클릭 ──────────────────────────→│
     │                              │                    3. OAuth│
     │  4. 콜백 (hash 포함)  ────────→│                           │
     │                              │  5. HMAC-SHA256 검증       │
     │                              │  6. telegram_id → users 조회│
     │                              │  7. JWT 생성               │
     │  8. Set-Cookie (httpOnly)  ←──│                           │
     │  9. /dashboard 리다이렉트     │                           │
```

### 5.2 JWT 구조

```json
{
  "sub": 1,              // users.id
  "tid": "123456789",    // telegram_id
  "level": "N3",         // jlpt_level
  "iat": 1710500000,
  "exp": 1711104800      // 7일
}
```

### 5.3 미들웨어

```typescript
// web/lib/session.ts
export async function getSession(cookies: ReadonlyRequestCookies): Promise<User | null> {
  const token = cookies.get('session')?.value;
  if (!token) return null;

  const payload = verifyJWT(token);  // jose 라이브러리
  if (!payload) return null;

  return { id: payload.sub, telegramId: payload.tid, jlptLevel: payload.level };
}

// app/dashboard/layout.tsx — AuthGuard
export default async function DashboardLayout({ children }) {
  const session = await getSession(cookies());
  if (!session) redirect('/');
  return <>{children}</>;
}
```

---

## 6. 컴포넌트 설계

### 6.1 페이지별 컴포넌트 구성

#### 메인 대시보드 (`/dashboard`)
```
DashboardPage
├── SummaryCards          (총 학습일 / 스트릭 / 퀴즈 수 / 정답률)
├── CalendarHeatmap       (react-activity-calendar, 6개월)
├── TodaySummary          (오늘 학습 내용 + 퀴즈 결과)
└── ReviewReminder        (FSRS 복습 예정 카드 수)
```

#### 상세 통계 (`/dashboard/stats`)
```
StatsPage
├── PeriodSelector        (week / month / all 탭)
├── AccuracyChart         (recharts LineChart)
├── QuizTypeRadar         (recharts RadarChart)
├── LevelDistribution     (recharts PieChart)
└── StreakHistory          (월별 학습일 수 바 차트)
```

#### 콘텐츠 검색 (`/dashboard/search`)
```
SearchPage
├── SearchFilters         (레벨 셀렉트 / 유형 탭 / 키워드 인풋)
├── ContentCardList       (검색 결과 카드 그리드)
│   └── ContentCard       (제목, 미리보기, 레벨 태그, 학습 마크)
├── Pagination            (페이지 네비게이션)
└── ContentDetailModal    (클릭 시 상세 — 후리가나 + 번역 + 관련 퀴즈)
```

#### 레벨 테스트 (`/dashboard/level-test`)
```
LevelTestPage
├── TestIntro             (안내 + 시작 버튼)
├── TestProgress          (진행률 바 + 문항 번호)
├── QuestionCard          (문제 + 4지선다 옵션)
└── TestResult            (레벨별 점수 + 추천 레벨 + 적용 버튼)
```

### 6.2 공통 컴포넌트

| 컴포넌트 | 라이브러리 | 설명 |
|----------|-----------|------|
| Button, Card, Input, Select | shadcn/ui | 기본 UI |
| Badge | shadcn/ui | JLPT 레벨 태그 (N5=초록, N1=빨강) |
| Dialog | shadcn/ui | 콘텐츠 상세 모달 |
| Skeleton | shadcn/ui | 로딩 상태 |
| Tabs | shadcn/ui | 기간 선택, 유형 필터 |

### 6.3 데이터 패칭 전략

| 페이지 | 방식 | 이유 |
|--------|------|------|
| Dashboard | Server Component + fetch | 초기 로딩 SSR, SEO 불필요하지만 빠른 FCP |
| Stats | Client Component + SWR | 기간 탭 전환 시 클라이언트 리패칭 |
| Search | Client Component + SWR | 필터/키워드 변경 시 실시간 검색 |
| Level Test | Client Component + state | 인터랙티브 테스트 플로우 |

---

## 7. 기술 스택 상세

### 7.1 의존성

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.0",
    "jose": "^5.0.0",
    "recharts": "^2.13.0",
    "react-activity-calendar": "^2.7.0",
    "react-tooltip": "^5.28.0",
    "swr": "^2.2.0",
    "dayjs": "^1.11.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "drizzle-kit": "^0.30.0"
  }
}
```

### 7.2 shadcn/ui 설치 컴포넌트

```bash
npx shadcn@latest init
npx shadcn@latest add button card input select badge tabs dialog skeleton separator
```

---

## 8. 배포 설계

### 8.1 Dockerfile

```dockerfile
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Phase 1 스키마 참조를 위해 상위 src/db/ 복사
COPY ../src/db ./src-db
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### 8.2 docker-compose.yml 추가

```yaml
  web:
    build:
      context: .
      dockerfile: web/Dockerfile
    container_name: nihongo-web
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgres://postgres:${DB_PASSWORD}@shared-postgres:5432/nihongo
      - BOT_TOKEN=${BOT_TOKEN}
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - shared
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nihongo-web.rule=Host(`nihongo.dltmxm.link`)"
      - "traefik.http.routers.nihongo-web.entrypoints=websecure"
      - "traefik.http.routers.nihongo-web.tls.certresolver=letsencrypt"
      - "traefik.http.services.nihongo-web.loadbalancer.server.port=3000"
```

### 8.3 도메인 라우팅

```
nihongo.dltmxm.link
  → Cloudflare Tunnel
    → 홈서버 Traefik
      → nihongo-web 컨테이너 (port 3000)
```

---

## 9. Phase 1 코드 재사용 전략

### 9.1 DB 스키마 공유

웹 앱에서 Phase 1의 `src/db/schema.ts`를 직접 import:

```typescript
// web/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Phase 1 스키마 (상대 경로 또는 패키지 alias)
import * as schema from '../../src/db/schema.js';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

// re-export for convenience
export { schema };
```

### 9.2 tsconfig paths 설정

```json
{
  "compilerOptions": {
    "paths": {
      "@db/*": ["../src/db/*"],
      "@/*": ["./"]
    }
  }
}
```

### 9.3 재사용하지 않는 것

Phase 1 서비스 레이어 (`src/services/*.ts`)는 **참고만** 하고 웹 전용 쿼리를 새로 작성:

| 이유 | 설명 |
|------|------|
| 다른 데이터 형태 | 봇은 메시지 문자열, 웹은 JSON |
| 다른 집계 범위 | 봇은 7일, 웹은 6개월/전체 |
| SSR 호환성 | 봇 서비스는 singleton DB 의존 |

---

## 10. 구현 순서 (Build Sequence)

### Step 1: 프로젝트 초기화 (Day 1-2)

```
✅ Next.js 15 프로젝트 생성 (web/)
✅ Tailwind CSS + shadcn/ui 설정
✅ Drizzle 클라이언트 + Phase 1 스키마 연결
✅ 환경변수 설정 (.env.local)
✅ 기본 레이아웃 (헤더, 사이드바)
```

**핵심 파일:**
- `web/package.json`
- `web/app/layout.tsx`
- `web/lib/db.ts`
- `web/tailwind.config.ts`

### Step 2: Telegram 인증 (Day 2-3)

```
✅ Telegram Login Widget 통합
✅ HMAC-SHA256 검증 API (/api/auth/telegram)
✅ JWT 세션 관리 (jose)
✅ AuthGuard 컴포넌트
✅ /api/me 엔드포인트
```

**핵심 파일:**
- `web/app/page.tsx` (로그인)
- `web/app/api/auth/telegram/route.ts`
- `web/lib/auth.ts`
- `web/lib/session.ts`
- `web/components/layout/auth-guard.tsx`

### Step 3: 메인 대시보드 + 캘린더 (Day 3-5)

```
✅ 잔디 히트맵 (react-activity-calendar)
✅ 요약 카드 컴포넌트
✅ 오늘의 학습 요약
✅ 복습 예정 알림
✅ /api/calendar 엔드포인트
```

**핵심 파일:**
- `web/app/dashboard/page.tsx`
- `web/components/dashboard/calendar-heatmap.tsx`
- `web/components/dashboard/summary-cards.tsx`
- `web/app/api/calendar/route.ts`
- `web/lib/queries/calendar.ts`

### Step 4: 상세 통계 (Day 5-7)

```
✅ 정답률 추이 라인 차트
✅ 퀴즈 유형별 레이더 차트
✅ JLPT 레벨별 분포
✅ 기간 선택 탭 (week/month/all)
✅ /api/stats 엔드포인트
```

**핵심 파일:**
- `web/app/dashboard/stats/page.tsx`
- `web/components/stats/accuracy-chart.tsx`
- `web/components/stats/quiz-type-radar.tsx`
- `web/components/stats/level-distribution.tsx`
- `web/app/api/stats/route.ts`
- `web/lib/queries/stats.ts`

### Step 5: 콘텐츠 검색 (Day 7-9)

```
✅ 필터 UI (레벨, 유형, 키워드)
✅ 검색 결과 카드 목록
✅ 콘텐츠 상세 모달 (후리가나 + 번역)
✅ 페이지네이션
✅ /api/contents 엔드포인트
```

**핵심 파일:**
- `web/app/dashboard/search/page.tsx`
- `web/components/search/search-filters.tsx`
- `web/components/search/content-card.tsx`
- `web/components/search/content-detail.tsx`
- `web/app/api/contents/route.ts`
- `web/lib/queries/contents.ts`

### Step 6: 레벨 테스트 (Day 9-11)

```
✅ 테스트 시작/안내 페이지
✅ 적응형 출제 알고리즘
✅ 문항 UI (진행률, 선택지)
✅ 결과 페이지 (레벨 추천)
✅ level_test_results 테이블 마이그레이션
✅ /api/level-test/* 엔드포인트
```

**핵심 파일:**
- `web/app/dashboard/level-test/page.tsx`
- `web/components/level-test/*.tsx`
- `web/app/api/level-test/start/route.ts`
- `web/app/api/level-test/submit/route.ts`
- `web/lib/queries/level-test.ts`

### Step 7: 배포 (Day 11-12)

```
✅ Dockerfile 작성
✅ docker-compose.yml web 서비스 추가
✅ Cloudflare Tunnel 설정
✅ 도메인 연결 (nihongo.dltmxm.link)
✅ 통합 테스트
```

**핵심 파일:**
- `web/Dockerfile`
- `docker-compose.yml` (수정)

---

## 11. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Phase 1 스키마 import 경로 | 빌드 실패 | tsconfig paths + Docker COPY 전략 |
| Telegram Login 브라우저 호환 | 일부 사용자 로그인 불가 | Magic link 폴백 (봇에서 `/web` 명령 → 일회용 URL) |
| DB 동시 접근 (봇 + 웹) | 커넥션 풀 고갈 | 웹 connection pool max=5 제한 |
| 홈서버 성능 (Intel N150) | 느린 SSR | Next.js standalone + 정적 자산 CDN |
| 캘린더/차트 번들 크기 | 초기 로딩 느림 | `next/dynamic` + lazy import |

---

## 12. 환경변수

```env
# 필수
DATABASE_URL=postgres://postgres:password@shared-postgres:5432/nihongo
BOT_TOKEN=1234567:ABC...           # Telegram Login 검증용
JWT_SECRET=random-32-byte-string   # JWT 서명

# 선택
NEXT_PUBLIC_BOT_USERNAME=nihongo_daily_bot  # Login Widget용
NODE_ENV=production
```
