# nihongo-daily 웹 대시보드 기획서 (Phase 2)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | nihongo-web-dashboard (웹 학습 대시보드) |
| 작성일 | 2026-03-15 |
| 상위 프로젝트 | nihongo-daily (Phase 1 완료, 95% Match Rate) |
| 예상 기간 | 2-3주 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Telegram 봇만으로는 학습 캘린더, 상세 통계 차트, 콘텐츠 검색, 레벨 테스트 등 시각적/복잡한 UI가 필요한 기능을 제공할 수 없음. 텍스트 기반 `/stats`로는 학습 동기 부여와 진도 파악에 한계. |
| **Solution** | Next.js App Router + Tailwind + shadcn/ui 기반 웹 대시보드. 기존 Telegram 봇의 PostgreSQL DB를 공유하여 별도 백엔드 없이 서비스 레이어 재사용. Cloudflare Tunnel로 홈서버 직접 배포. |
| **Function UX Effect** | 잔디 히트맵으로 학습 일관성 시각화, 인터랙티브 차트로 퀴즈 유형별/기간별 성과 분석, 콘텐츠 아카이브 검색, 웹 기반 레벨 테스트. |
| **Core Value** | "학습 데이터를 눈으로 확인하고 동기를 유지한다" — 시각적 피드백으로 학습 지속률 향상 + 봇에서 불가능한 복잡한 인터랙션 제공. |

---

## 1. 배경 및 목표

### 1.1 배경

Phase 1 MVP(Telegram 봇)이 95% 설계 매칭률로 완료됨. 봇은 학습/퀴즈/복습/통계의 핵심 기능을 제공하지만, 다음 기능은 메신저로 구현이 불가능하거나 UX가 열악함:

- **학습 캘린더 (잔디 히트맵)** — 장기 학습 패턴 시각화
- **상세 통계 차트** — 퀴즈 유형별, JLPT 레벨별, 기간별 성과 분석
- **콘텐츠 검색/아카이브** — 과거 학습 콘텐츠 검색 및 재학습
- **레벨 테스트** — 긴 폼 UI가 필요한 배치 테스트

### 1.2 목표

1. 기존 봇 사용자가 **웹에서 학습 현황을 시각적으로 확인**
2. **콘텐츠 검색**으로 과거 학습 내용 복습
3. **레벨 테스트**로 정확한 JLPT 레벨 배치
4. Phase 1 서비스 레이어 **코드 재사용** 극대화

### 1.3 성공 지표

| 지표 | 목표 |
|------|------|
| 웹 대시보드 WAU | 봇 사용자의 30% |
| 레벨 테스트 완료율 | 50% |
| 평균 세션 시간 | 3분+ |
| 학습 캘린더 조회/주 | 2회+ |

---

## 2. 기능 범위

### 2.1 핵심 기능 (Must-have)

| 기능 | 설명 | 우선순위 |
|------|------|:--------:|
| **학습 캘린더** | GitHub 잔디 스타일 히트맵. 일별 학습 여부/강도 표시 | P0 |
| **통계 대시보드** | 퀴즈 정답률, JLPT 레벨별 성과, 스트릭, 기간별 추이 차트 | P0 |
| **Telegram 로그인** | Telegram Login Widget으로 인증 (별도 회원가입 불필요) | P0 |
| **콘텐츠 검색** | JLPT 레벨/유형/키워드로 과거 콘텐츠 검색 | P1 |
| **레벨 테스트** | 20-30문항 배치 테스트로 JLPT 레벨 자동 배정 | P1 |

### 2.2 제외 범위 (Phase 3)

- LINE Bot 연동
- AI 작문 퀴즈 + 자동 채점
- 소셜 기능 (랭킹, 스터디 그룹)
- 모바일 앱 (React Native)

---

## 3. 기술 아키텍처

### 3.1 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|-----------|
| **프레임워크** | Next.js 15 (App Router) | SSR, 홈서버 Docker 배포, API Route |
| **UI** | Tailwind CSS + shadcn/ui | 빠른 UI 개발, 일관된 디자인 시스템 |
| **차트** | recharts | React 네이티브, 가볍고 커스터마이징 용이 |
| **캘린더** | react-activity-calendar | GitHub 잔디 스타일 히트맵 |
| **인증** | Telegram Login Widget | 기존 봇 사용자 연계, 별도 OAuth 불필요 |
| **DB** | PostgreSQL (기존 shared-postgres) | Phase 1과 동일 DB 공유 |
| **ORM** | Drizzle ORM (기존 스키마 재사용) | Phase 1 schema.ts 그대로 사용 |
| **배포** | Docker + Cloudflare Tunnel | nihongo.dltmxm.link 도메인 |

### 3.2 아키텍처 구조

```
┌──────────────────────────────────────────────┐
│  사용자                                        │
│  ┌─────────────┐  ┌────────────────────────┐ │
│  │ Telegram Bot │  │ Web Dashboard          │ │
│  │ (Phase 1)    │  │ (Next.js, Phase 2)     │ │
│  │ 학습/퀴즈    │  │ 캘린더/통계/검색/테스트 │ │
│  └──────┬──────┘  └───────────┬────────────┘ │
│         │                      │              │
│         └──────────┬───────────┘              │
│                    │                           │
│         ┌──────────┴──────────┐               │
│         │   Service Layer     │               │
│         │ (Phase 1 코드 재사용)│               │
│         └──────────┬──────────┘               │
│                    │                           │
│         ┌──────────┴──────────┐               │
│         │  shared-postgres    │               │
│         │  (동일 DB 공유)      │               │
│         └─────────────────────┘               │
└──────────────────────────────────────────────┘
```

### 3.3 프로젝트 구조

```
web/                          # Next.js 앱 (monorepo 내 별도 디렉토리)
├── app/
│   ├── layout.tsx            # 루트 레이아웃
│   ├── page.tsx              # 랜딩/로그인
│   ├── dashboard/
│   │   ├── page.tsx          # 메인 대시보드 (캘린더 + 요약 통계)
│   │   ├── stats/page.tsx    # 상세 통계
│   │   ├── search/page.tsx   # 콘텐츠 검색
│   │   └── level-test/page.tsx # 레벨 테스트
│   └── api/
│       ├── auth/telegram/route.ts  # Telegram Login 검증
│       ├── stats/route.ts          # 통계 데이터 API
│       ├── calendar/route.ts       # 캘린더 데이터 API
│       ├── contents/route.ts       # 콘텐츠 검색 API
│       └── level-test/route.ts     # 레벨 테스트 API
├── components/
│   ├── ui/                   # shadcn/ui 컴포넌트
│   ├── calendar-heatmap.tsx  # 잔디 히트맵
│   ├── stats-chart.tsx       # 통계 차트
│   ├── content-card.tsx      # 콘텐츠 카드
│   └── level-test-form.tsx   # 레벨 테스트 폼
├── lib/
│   ├── db.ts                 # Drizzle 클라이언트 (Phase 1 재사용)
│   ├── auth.ts               # Telegram Login 검증 로직
│   └── queries.ts            # DB 쿼리 함수
├── Dockerfile
├── package.json
└── tailwind.config.ts
```

---

## 4. 페이지별 상세 기능

### 4.1 메인 대시보드 (`/dashboard`)

- **학습 캘린더**: 최근 6개월 잔디 히트맵 (일별 학습 강도: 0-4단계)
- **요약 카드**: 총 학습일 / 현재 스트릭 / 총 퀴즈 수 / 평균 정답률
- **오늘의 요약**: 오늘 학습 내용, 퀴즈 결과
- **복습 예정**: 오늘 복습해야 할 FSRS 카드 수

### 4.2 상세 통계 (`/dashboard/stats`)

- **정답률 추이**: 일별/주별/월별 라인 차트
- **퀴즈 유형별 성과**: 읽기/어휘/문법/해석 레이더 차트
- **JLPT 레벨별 분포**: 학습한 콘텐츠의 레벨 분포 도넛 차트
- **스트릭 기록**: 최장 스트릭, 현재 스트릭, 월별 학습일 수

### 4.3 콘텐츠 검색 (`/dashboard/search`)

- **필터**: JLPT 레벨 (N5-N1), 유형 (뉴스/문장/문법/어휘), 키워드
- **결과 카드**: 제목, 본문 미리보기, 레벨 태그, 학습 여부 마크
- **상세 보기**: 전체 본문 + 후리가나 + 한국어 번역 + 관련 퀴즈

### 4.4 레벨 테스트 (`/dashboard/level-test`)

- **형식**: 20-30문항 적응형 테스트 (정답률에 따라 난이도 조절)
- **출제**: 기존 DB의 퀴즈에서 레벨별 균형 출제
- **결과**: 추천 JLPT 레벨 + 레벨별 정답률 상세
- **적용**: 결과를 users 테이블에 자동 반영 (사용자 동의 후)

---

## 5. 인증 전략

### 5.1 Telegram Login Widget

```
1. 웹에서 Telegram Login 버튼 클릭
2. Telegram OAuth → hash 검증 (BOT_TOKEN 기반 HMAC-SHA256)
3. telegram_id로 기존 users 테이블 조회
4. JWT 세션 토큰 발급 (httpOnly cookie)
5. 미등록 사용자 → "봇에서 /start를 먼저 실행하세요" 안내
```

- 별도 회원가입 불필요 — 봇 사용자가 그대로 웹 로그인
- BOT_TOKEN 기반 서버사이드 검증으로 보안 확보

---

## 6. DB 스키마 변경

### 6.1 기존 테이블 (변경 없음)

Phase 1의 7개 테이블 그대로 사용:
- `users`, `contents`, `vocabularies`, `quizzes`
- `user_quiz_results`, `daily_logs`, `review_cards`

### 6.2 추가 테이블 (필요 시)

| 테이블 | 목적 | 비고 |
|--------|------|------|
| `level_test_results` | 레벨 테스트 이력 | user_id, recommended_level, score, taken_at |
| `web_sessions` | 웹 JWT 세션 | 별도 관리 필요 시 (또는 stateless JWT로 대체) |

---

## 7. 배포 전략

### 7.1 Docker 구성

```yaml
# docker-compose.yml에 web 서비스 추가
services:
  app:          # 기존 Telegram 봇 (변경 없음)
  redis:        # 기존 Redis (변경 없음)
  web:          # 새로 추가
    build: ./web
    container_name: nihongo-web
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgres://...
      - BOT_TOKEN=${BOT_TOKEN}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    networks:
      - shared
    labels:
      - traefik.enable=true
      - traefik.http.routers.nihongo.rule=Host(`nihongo.dltmxm.link`)
```

### 7.2 도메인

- `nihongo.dltmxm.link` → Cloudflare Tunnel → 홈서버 Traefik → nihongo-web 컨테이너

---

## 8. 구현 순서 (Build Sequence)

```
Week 1: 프로젝트 셋업 + 인증 + 캘린더
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Step 1. Next.js 프로젝트 초기화
  ├── web/ 디렉토리 생성 (monorepo)
  ├── Next.js 15 + Tailwind + shadcn/ui 설정
  ├── Drizzle 클라이언트 (Phase 1 schema 재사용)
  └── Dockerfile 작성

  Step 2. Telegram Login 인증
  ├── Telegram Login Widget 통합
  ├── HMAC-SHA256 검증 API
  ├── JWT 세션 관리
  └── 인증 미들웨어

  Step 3. 메인 대시보드 + 캘린더
  ├── 잔디 히트맵 (react-activity-calendar)
  ├── 요약 카드 (총 학습일, 스트릭, 정답률)
  └── /api/calendar API Route

Week 2: 통계 + 검색
━━━━━━━━━━━━━━━━━━

  Step 4. 상세 통계 페이지
  ├── 정답률 추이 차트 (recharts)
  ├── 퀴즈 유형별 레이더 차트
  ├── JLPT 레벨별 분포
  └── /api/stats API Route

  Step 5. 콘텐츠 검색
  ├── 필터 UI (레벨, 유형, 키워드)
  ├── 검색 결과 카드 목록
  ├── 콘텐츠 상세 보기 (후리가나 + 번역)
  └── /api/contents API Route

Week 3: 레벨 테스트 + 배포
━━━━━━━━━━━━━━━━━━━━━━━━

  Step 6. 레벨 테스트
  ├── 적응형 출제 알고리즘
  ├── 테스트 UI (진행률, 타이머)
  ├── 결과 페이지 (레벨 추천)
  └── /api/level-test API Route

  Step 7. 배포
  ├── Docker 빌드 + docker-compose.yml 업데이트
  ├── Cloudflare Tunnel 설정
  └── 도메인 연결 (nihongo.dltmxm.link)
```

---

## 9. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Telegram Login 지원 브라우저 제한 | 일부 사용자 로그인 불가 | Magic link 폴백 (봇에서 일회용 링크 발송) |
| DB 동시 접근 (봇 + 웹) | 커넥션 풀 고갈 | 웹 읽기 전용 리플리카 또는 커넥션 풀 제한 분리 |
| 홈서버 성능 (Intel N150) | 느린 SSR 렌더링 | 정적 생성 + ISR 활용, heavy 쿼리 Redis 캐시 |
| 캘린더/차트 라이브러리 용량 | 번들 크기 증가 | 동적 import + code splitting |

---

## 10. Phase 1 연계 사항

| 항목 | Phase 1 자산 | Phase 2 활용 |
|------|-------------|-------------|
| DB 스키마 | `src/db/schema.ts` | Drizzle 스키마 import |
| 서비스 로직 | `src/services/*.ts` | 쿼리 함수 참고/재사용 |
| 환경변수 | `.env` (BOT_TOKEN, DB_*) | 동일 환경변수 공유 |
| Docker | `docker-compose.yml` | web 서비스 추가 |
| 데이터 | 3,243어 + NHK 기사 | 검색/테스트에 활용 |
