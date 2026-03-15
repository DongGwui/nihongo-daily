# 홈 서버 인프라 레퍼런스

> 최종 업데이트: 2026-03-06
> 신규 프로젝트 개발 시 참조용 문서

---

## 1. 인프라 개요

| 항목 | 내용 |
|------|------|
| 하드웨어 | 미니 PC · Intel N150 · 16GB RAM · 512GB SSD |
| OS | Ubuntu Server (LTS) |
| 도메인 | dltmxm.link |
| 외부 접근 | Cloudflare Tunnel (공개 서비스) |
| 관리 접근 | Tailscale VPN (관리자 전용) |
| 리버스 프록시 | Traefik |

### 리소스 제약
- N150은 저전력 4코어 — 무거운 동시 빌드 지양
- Go 백엔드 예상 메모리: 50–100MB / 서비스
- 실시간 멀티플레이어 등 고동시성 서비스는 접속자 수 설계 필요

---

## 2. 네트워크 구성

```
인터넷
  ├─ Cloudflare Tunnel ──→ localhost:80 → Traefik → 각 서비스 (공개)
  └─ Tailscale VPN ──────→ localhost:80 → Traefik → 관리 서비스 (비공개)
```

### 운영 중인 도메인

| 서브도메인 | 서비스 | 접근 | 포트 |
|------------|--------|------|------|
| blog.dltmxm.link | 블로그 프론트 | Cloudflare | 3000 |
| api.dltmxm.link | 블로그 API | Cloudflare | 8080 |
| cdn.dltmxm.link | MinIO CDN | Cloudflare | 9000 |
| db.dltmxm.link | CloudBeaver | Tailscale | 8978 |
| grafana.dltmxm.link | Grafana | Tailscale | 3000 |
| games.dltmxm.link | 게임 플랫폼 (예정) | Cloudflare | 3000 |

---

## 3. 공유 인프라 서비스

> 모든 공유 서비스는 `~/docker/shared/docker-compose.yml` 에서 관리

### 3.1 PostgreSQL

- 컨테이너명: `shared-postgres`
- 네트워크: `shared`
- pg_bigm 확장 설치됨 (한국어 전문 검색 지원)
- 포트 외부 노출 없음

**환경변수 (신규 프로젝트 .env)**
```env
DB_HOST=shared-postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<공유 postgres 비밀번호>
DB_NAME=<프로젝트명>
DB_SSLMODE=disable
```

**새 DB 생성**
```bash
docker exec -it shared-postgres psql -U postgres -c "CREATE DATABASE 프로젝트명;"
```

**현재 DB 목록**

| DB명 | 사용 프로젝트 |
|------|-------------|
| blog | blog-api |
| games | games-api (예정) |

---

### 3.2 MinIO (오브젝트 스토리지)

- 컨테이너명: `shared-minio`
- 네트워크: `shared`
- CDN URL: `https://cdn.dltmxm.link`

**환경변수 (신규 프로젝트 .env)**
```env
MINIO_ENDPOINT=shared-minio:9000
MINIO_ACCESS_KEY=<MinIO 액세스 키>
MINIO_SECRET_KEY=<MinIO 시크릿 키>
MINIO_BUCKET=<프로젝트명>-bucket
MINIO_USE_SSL=false
MINIO_PUBLIC_URL=https://cdn.dltmxm.link
```

**새 버킷 생성**
```bash
docker exec -it shared-minio mc mb local/버킷명
docker exec -it shared-minio mc anonymous set download local/버킷명  # 공개 읽기
```

**현재 버킷 목록**

| 버킷명 | 용도 | 접근 정책 |
|--------|------|----------|
| blog-images | 블로그 이미지 | public download |
| games-avatars | 게임 아바타 (예정) | public download |

---

### 3.3 Redis

> ⚠️ Redis는 **프로젝트별 전용 인스턴스** 사용 원칙
> `FLUSHALL` 등 전역 명령어로 인한 데이터 유실 방지 목적
> Redis는 30–50MB로 경량이므로 인스턴스 분리 부담 없음

**프로젝트별 Redis docker-compose 설정**
```yaml
redis:
  image: redis:7-alpine
  container_name: ${PROJECT_NAME}-redis
  restart: unless-stopped
  command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
  volumes:
    - redis_data:/data
  networks:
    - ${PROJECT_NAME}-internal
  healthcheck:
    test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**환경변수**
```env
REDIS_HOST=<프로젝트명>-redis:6379
REDIS_PASSWORD=<전용 Redis 비밀번호>
```

---

## 4. Traefik 라우팅 설정

신규 서비스에 라우팅을 추가하려면 `labels`만 추가하면 됩니다.

### 기본 설정 (단일 도메인)
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.<서비스명>.rule=Host(`서비스명.dltmxm.link`)"
  - "traefik.http.routers.<서비스명>.entrypoints=web"
  - "traefik.http.services.<서비스명>.loadbalancer.server.port=<내부포트>"
networks:
  - proxy
```

### 동일 도메인에서 경로로 분리 (프론트 + API)
```yaml
# 프론트엔드
- "traefik.http.routers.games-web.rule=Host(`games.dltmxm.link`)"

# API (경로 우선)
- "traefik.http.routers.games-api.rule=Host(`games.dltmxm.link`) && PathPrefix(`/api`)"
```

### Tailscale 전용 서비스 (관리 서비스)
```yaml
- "traefik.http.routers.<서비스명>.entrypoints=tailscale"
```

---

## 5. 신규 프로젝트 docker-compose.yml 템플릿

```yaml
services:
  app:
    build:
      context: ../../../Downloads
      dockerfile: Dockerfile
    container_name: ${PROJECT_NAME}-app
    restart: unless-stopped
    environment:
      # PostgreSQL (공유)
      - DB_HOST=shared-postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${PROJECT_NAME}
      - DB_SSLMODE=disable
      # Redis (전용)
      - REDIS_HOST=${PROJECT_NAME}-redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      # MinIO (공유)
      - MINIO_ENDPOINT=shared-minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - MINIO_BUCKET=${PROJECT_NAME}-bucket
      - MINIO_USE_SSL=false
      - MINIO_PUBLIC_URL=https://cdn.dltmxm.link
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${PROJECT_NAME}.rule=Host(`${PROJECT_NAME}.dltmxm.link`)"
      - "traefik.http.routers.${PROJECT_NAME}.entrypoints=web"
      - "traefik.http.services.${PROJECT_NAME}.loadbalancer.server.port=8080"
    networks:
      - proxy
      - shared
      - ${PROJECT_NAME}-internal
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    container_name: ${PROJECT_NAME}-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - ${PROJECT_NAME}-internal
    healthcheck:
      test: [ "CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping" ]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  proxy:
    external: true
  shared:
    external: true
  ${PROJECT_NAME}-internal:
    driver: bridge

volumes:
  redis_data:
```

---

## 6. 신규 프로젝트 .env 템플릿

```env
# 프로젝트 식별자
PROJECT_NAME=프로젝트명

# PostgreSQL (공유 인프라 비밀번호)
DB_PASSWORD=

# Redis (이 프로젝트 전용 — 새로 생성)
REDIS_PASSWORD=

# MinIO (공유 인프라 자격증명)
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=

# JWT (인증 필요 시)
JWT_SECRET=
JWT_EXPIRY=24h

# OAuth (사용 시)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# DISCORD_CLIENT_ID=
# DISCORD_CLIENT_SECRET=
# SLACK_CLIENT_ID=
# SLACK_CLIENT_SECRET=
```

---

## 7. 신규 프로젝트 배포 체크리스트

### 사전 준비
- [ ] `mkdir -p ~/docker/프로젝트명` 디렉토리 생성
- [ ] 공유 PostgreSQL에 DB 생성
- [ ] 공유 MinIO에 버킷 생성 (필요 시)
- [ ] Cloudflare Tunnel에 서브도메인 추가 (외부 공개 시)
- [ ] GitHub Actions CI/CD 워크플로우 작성

### 배포 순서
```bash
# 1. 디렉토리 이동
cd ~/docker/프로젝트명

# 2. 환경변수 설정
cp .env.example .env && nano .env

# 3. 공유 네트워크 확인
docker network ls | grep -E "shared|proxy"

# 4. 서비스 실행
docker compose up -d

# 5. 상태 및 로그 확인
docker compose ps
docker compose logs -f

# 6. 라우팅 확인
curl -H "Host: 프로젝트명.dltmxm.link" http://localhost
```

### 배포 후 확인
- [ ] 컨테이너 전부 `healthy` 상태인지 확인
- [ ] Traefik 라우팅 정상 동작 확인
- [ ] DB 마이그레이션 완료 확인
- [ ] 외부 접근 테스트 (Cloudflare Tunnel)
- [ ] Grafana에서 새 컨테이너 메트릭 수집 확인

---

## 8. 트러블슈팅

| 증상 | 확인 사항 |
|------|----------|
| Traefik 404 | `proxy` 네트워크 연결 여부 · `traefik.enable=true` 라벨 · 라우터 이름 중복 |
| PostgreSQL 연결 실패 | `shared` 네트워크 연결 여부 · 호스트명 `shared-postgres` 사용 여부 · DB 존재 여부 |
| Redis 연결 실패 | 전용 Redis 컨테이너 실행 여부 · 네트워크 · 비밀번호 일치 여부 |
| 이미지 빌드 실패 | Docker 빌드 캐시 삭제: `docker compose build --no-cache` |
| 정적 파일 ENOENT | 브라우저 캐시 + 컨테이너 재빌드 (`docker compose down && up -d --build`) |

---

## 9. 자주 쓰는 명령어

```bash
# 전체 컨테이너 상태
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 특정 서비스 로그
docker compose logs -f <서비스명>

# 이미지 업데이트 재시작
docker compose pull && docker compose up -d

# PostgreSQL 접속
docker exec -it shared-postgres psql -U postgres -d <DB명>

# PostgreSQL 백업 / 복원
docker exec shared-postgres pg_dump -U postgres <DB명> > backup.sql
cat backup.sql | docker exec -i shared-postgres psql -U postgres -d <DB명>

# MinIO 버킷 목록
docker exec -it shared-minio mc ls local

# 네트워크 연결 컨테이너 확인
docker network inspect proxy
docker network inspect shared
```
