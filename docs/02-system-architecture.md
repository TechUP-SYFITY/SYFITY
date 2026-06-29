# 02. System Architecture

## 1. 문서 정보

| 항목      | 내용                             |
| --------- | -------------------------------- |
| 문서명    | Syfity System Architecture       |
| 버전      | v1.0                             |
| 상태      | 초안                             |
| 작성 목적 | Syfity MVP 전체 시스템 구조 정의 |
| 기반 문서 | `01-prd.md`                      |

---

## 2. 기술 스택

| 구분          | 기술                     | 비고                                  |
| ------------- | ------------------------ | ------------------------------------- |
| FE 프레임워크 | Next.js 16 (App Router)  | Turbopack 기본 번들러                 |
| FE 상태 관리  | Zustand                  | Realtime State, Client State          |
| FE 서버 상태  | TanStack Query           | REST API 데이터                       |
| FE 스타일     | Tailwind CSS + shadcn/ui |                                       |
| FE 폼         | React Hook Form + Zod    |                                       |
| FE 테스트     | Vitest + Playwright      |                                       |
| BE 프레임워크 | Express.js + Socket.IO   | REST API + 실시간 단일 서버           |
| DB            | Supabase (PostgreSQL)    |                                       |
| ORM           | Prisma                   | 마이그레이션 + 타입 자동 생성         |
| FE 호스팅     | Vercel                   |                                       |
| BE 호스팅     | Render                   | 무료 티어, 슬립 있음                  |
| 외부 API      | YouTube Data API v3      | 서버사이드 프록시                     |
| 패키지 매니저 | pnpm (workspace)         | 모노레포                              |
| 캐시          | node-cache               | 추상화하여 Redis 교체 가능하도록 설계 |

---

## 3. 레포지토리 구조

모노레포 구조를 채택한다. 배포 대상 애플리케이션은 `apps/`에, 공유 패키지는 `packages/`에 위치한다.

```
syfity/
  apps/
    frontend/         → Next.js (Vercel 배포)
    backend/          → Express.js + Socket.IO (Render 배포)
  packages/
    shared/           → 공통 타입, 상수, DTO
  package.json        → pnpm workspace 설정
  pnpm-workspace.yaml
```

### pnpm workspace 설정

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### shared 패키지 역할

FE와 BE가 공유하는 타입, 상수, DTO를 관리한다. 내부 구조는 DB 스키마, API Spec, Socket 이벤트 스펙 확정 후 구체화한다.

```
packages/shared/
  src/
    types/       → 공통 도메인 타입
    constants/   → 공통 상수
    dto/         → API 요청/응답 타입
  index.ts
  package.json   → name: @syfity/shared
```

---

## 4. 인프라 구조

### 전체 구성

```mermaid
graph TD
    Client["Browser<br>Next.js / Vercel"]

    subgraph Express["Express Server (Render)"]
        API["REST API Router<br>/auth /rooms /playlist<br>/youtube /me"]
        Socket["Socket.IO Server<br>room:join playback:play<br>playlist:updated chat:send ..."]
        Prisma["Prisma Client"]
        Cache["Cache Layer<br>node-cache (→ Redis 교체 가능)"]
    end

    subgraph DB["Supabase (PostgreSQL)"]
        Tables["users / rooms / room_members / recent_rooms<br>playlist_items / playback_states / chat_messages"]
    end

    YouTube["YouTube Data API v3<br>search.list / videos.list"]

    Client -->|REST API| API
    Client -->|Socket.IO| Socket
    API --> Prisma
    Socket --> Prisma
    Prisma --> DB
    API -->|서버사이드 프록시| YouTube
```

### 컴포넌트 역할

| 컴포넌트           | 역할                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| Next.js (Vercel)   | UI 렌더링 전용. 데이터 관련 로직 없음                                                             |
| Express (Render)   | REST API + Socket.IO + YouTube API 프록시                                                         |
| Supabase           | 영구 데이터 저장 (PostgreSQL)                                                                     |
| Prisma             | DB 접근 레이어, 마이그레이션 관리, 타입 생성                                                      |
| Cache (node-cache) | Host 타이머, 검색 결과 캐싱, 참여자 상태. CacheStore 인터페이스로 추상화하여 추후 Redis 교체 가능 |
| YouTube Data API   | 영상 검색, 영상 정보 조회                                                                         |

---

## 5. 환경 구성

### 로컬 개발 환경

```
apps/frontend   → http://localhost:3000
apps/backend    → http://localhost:4000
DB              → Supabase CLI (Docker 로컬 인스턴스)
```

### 운영 환경

```
apps/frontend   → https://{vercel-project}.vercel.app
apps/backend    → https://{render-service}.onrender.com
DB              → Supabase 클라우드 (prod 프로젝트)
```

### BE 호스팅 이전 고려 사항

Render 무료 티어에서 슬립, 재시작, 성능 문제가 반복될 경우 AWS EC2 등 상시 실행 가능한 서버로 이전을 고려한다.

### 커스텀 도메인 적용 시 (추후)

도메인 미확정. 결정 시 FE는 Vercel에, BE는 서브도메인으로 연결한다.

```
apps/frontend   → https://{domain}
apps/backend    → https://api.{domain}   (서브도메인)
```

### 환경변수

**apps/frontend (.env.local)**

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

**apps/backend (.env)**

```
PORT=4000
CLIENT_URL=http://localhost:3000

# CORS 허용 origin (쉼표 구분, 로컬은 기본값으로 fallback)
# 운영: ALLOWED_ORIGINS={vercel-url},{custom-domain} (결정 후 설정)
ALLOWED_ORIGINS=http://localhost:3000

# Supabase (로컬)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# YouTube
YOUTUBE_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 6. DB 전략

### 환경별 DB

| 환경      | DB                    | 비고                    |
| --------- | --------------------- | ----------------------- |
| 로컬 개발 | Supabase CLI (Docker) | 팀원 각자 독립 인스턴스 |
| 운영      | Supabase 클라우드     | prod 프로젝트 1개       |

### 마이그레이션 워크플로우

스키마 변경은 반드시 Prisma migrate를 통해 코드로 관리한다. Supabase 대시보드에서 직접 테이블을 수정하지 않는다.

```
스키마 변경 시
  1. prisma/schema.prisma 수정
  2. pnpm --filter backend prisma migrate dev --name {변경 내용}
  3. migration 파일 Git 커밋
  4. PR 생성 → 리뷰 → 머지

팀원 PR 머지 후
  1. git pull
  2. pnpm install          (패키지 변경 시)
  3. supabase db reset     (마이그레이션 재적용)
```

PR description에 스키마 변경 여부를 명시하는 것을 컨벤션으로 한다.

### Supabase CLI 초기 설정

```
최초 1회 (담당자)
  1. supabase init
  2. supabase/  폴더 Git 커밋

팀원 온보딩
  1. Docker 설치
  2. Supabase CLI 설치: brew install supabase/tap/supabase
  3. supabase start
```

---

## 7. 캐시 레이어

### 추상화 구조

MVP에서는 node-cache를 사용하되, `CacheStore` 인터페이스로 추상화하여 추후 Redis로 교체 가능하도록 설계한다.

```
apps/backend/src/lib/cache/
  cache.interface.ts   → CacheStore 인터페이스 정의
  node-cache.store.ts  → node-cache 구현체 (MVP)
  redis.store.ts       → Redis 구현체 (추후 교체)
  index.ts             → 구현체 주입 (교체 시 이 파일만 수정)
```

실제 사용하는 코드는 `CacheStore` 인터페이스만 바라보므로, Redis로 교체 시 비즈니스 로직 수정이 불필요하다.

### 캐시 사용 대상

| 용도                    | key                   | TTL                  |
| ----------------------- | --------------------- | -------------------- |
| Host 타이머 상태        | `host-timer:{roomId}` | 60초                 |
| YouTube 검색 결과       | `yt-search:{검색어}`  | 5분                  |
| Room 참여자 온라인 상태 | `presence:{roomId}`   | Socket 이벤트로 갱신 |

### 추후 Redis 교체 조건

- Render 서버 재시작으로 인한 Host 타이머 유실 문제가 반복될 때
- YouTube 검색 쿼터 소진이 빈번할 때
- 서버 인스턴스가 2개 이상으로 늘어날 때

---

## 8. YouTube API

### 역할 분리

YouTube API Key는 서버에서만 사용한다. 클라이언트는 Syfity 백엔드 API를 통해서만 YouTube 데이터에 접근한다.

```
Client → GET /search?q={검색어}
       → Express 서버 → YouTube Data API v3
       → 결과 반환
```

### API 사용량

| 기능           | 엔드포인트              | 유닛 소모  | 비고                      |
| -------------- | ----------------------- | ---------- | ------------------------- |
| 영상 검색      | `search.list`           | 100유닛/회 | 하루 10,000유닛 무료 한도 |
| 영상 정보 조회 | `videos.list`           | 1유닛/회   | 링크 추가 시 사용         |
| videoId 파싱   | 서버 자체 처리 (정규식) | 0유닛      | API 호출 없음             |

### videoId 파싱 대상 URL

```
https://www.youtube.com/watch?v={videoId}
https://youtu.be/{videoId}
https://music.youtube.com/watch?v={videoId}
```

---

## 9. CORS 설정

FE와 BE의 도메인이 다르기 때문에 Express에서 CORS를 명시적으로 설정한다. 허용 origin은 환경변수로 관리하여 도메인 변경 시 코드 수정 없이 대응한다.

```ts
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'];

const isAllowedOrigin = (origin: string) => {
  if (allowedOrigins.includes(origin)) return true;
  // Vercel Preview URL 패턴 허용 (프로젝트명 확정 후 수정)
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

---

## 10. 주요 흐름

### 10.1 Room 생성 흐름

```mermaid
sequenceDiagram
    actor Host
    participant FE as Next.js
    participant BE as Express
    participant DB as Supabase

    Host->>FE: Room 생성 버튼 클릭
    FE->>BE: POST /rooms
    BE->>DB: Room 생성 (status: active)
    BE->>DB: 초대 코드 저장
    BE-->>FE: Room 정보 + 초대 코드 응답
    FE->>FE: Room Page 진입
    FE->>BE: Socket room:join 이벤트
    BE->>DB: room_members에 Host 기록
    BE-->>FE: 입장 완료
```

### 10.2 Room 입장 흐름

```mermaid
sequenceDiagram
    actor Member
    participant FE as Next.js
    participant BE as Express
    participant DB as Supabase

    Member->>FE: 초대 코드 입력
    FE->>BE: POST /rooms/join
    BE->>DB: 초대 코드 검증 + Room 상태 확인
    DB-->>BE: Room active 확인
    BE->>DB: Room 정보, Playlist, PlaybackState, 참여자 목록 조회
    BE-->>FE: 전체 Room 데이터 응답
    FE->>FE: Room Page 진입
    FE->>BE: Socket room:join 이벤트
    BE-->>FE: 서버 기준 PlaybackState broadcast
    FE->>FE: currentRoomTime 계산 후 YouTube Player 동기화
```

### 10.3 음악 검색 흐름

```mermaid
sequenceDiagram
    actor User
    participant FE as Next.js
    participant BE as Express
    participant YT as YouTube Data API v3

    User->>FE: 검색어 입력
    FE->>BE: GET /search?q={검색어}
    BE->>YT: search.list 호출 (100유닛)
    YT-->>BE: 검색 결과 반환
    BE->>BE: 결과 가공 (videoId, title, channelTitle, thumbnailUrl, duration)
    BE-->>FE: 가공된 검색 결과 응답
    FE->>FE: 검색 결과 표시
```

### 10.4 링크 기반 곡 추가 흐름

```mermaid
sequenceDiagram
    actor User
    participant FE as Next.js
    participant BE as Express
    participant YT as YouTube Data API v3
    participant DB as Supabase

    User->>FE: YouTube URL 입력
    FE->>BE: POST /rooms/:roomId/playlist (youtubeUrl 포함)
    BE->>BE: 정규식으로 videoId 파싱 (0유닛)
    BE->>YT: videos.list 호출 (1유닛)
    YT-->>BE: 영상 정보 반환
    BE->>DB: playlist_items 저장
    BE-->>FE: Socket playlist:updated broadcast
    FE->>FE: Playlist UI 업데이트
```

### 10.5 재생 동기화 흐름

```mermaid
sequenceDiagram
    actor Host
    participant FE_H as Next.js (Host)
    participant BE as Express
    participant DB as Supabase
    participant FE_M as Next.js (Member)

    Host->>FE_H: 재생 버튼 클릭
    FE_H->>BE: Socket playback:play 이벤트
    BE->>DB: PlaybackState 갱신<br>(baseCurrentTime, serverStartedAt, isPlaying: true)
    BE-->>FE_H: playback:play broadcast
    BE-->>FE_M: playback:play broadcast
    FE_H->>FE_H: currentRoomTime 계산 후 YouTube Player 동기화
    FE_M->>FE_M: currentRoomTime 계산 후 YouTube Player 동기화

    Note over FE_H,FE_M: 서버가 currentTime 역산 후 전달, 클라이언트는 seek만 수행
```

### 10.6 광고/버퍼링 후 자동 보정 흐름

```mermaid
sequenceDiagram
    participant Player as YouTube Player
    participant FE as Next.js (Client)
    participant BE as Express

    Player->>FE: 광고 또는 버퍼링 상태 감지
    FE->>FE: "자동 동기화 대기 중" UI 표시
    Player->>FE: 재생 가능 상태로 전환
    FE->>BE: 현재 PlaybackState 요청
    BE-->>FE: 서버 기준 PlaybackState 응답
    FE->>FE: currentRoomTime 계산
    FE->>Player: seek (현재 Room 시점으로)
    FE->>FE: "자동 동기화 완료" UI 표시
```

### 10.7 10초 주기 자동 보정 흐름

```mermaid
flowchart TD
    A[서버 10초 주기 broadcast<br>playback:sync currentTime]
    A --> B[클라이언트 수신]
    B --> C[YouTube Player 현재 재생 위치와 비교]
    C --> D{오차 2초 이상?}
    D -->|No| E[보정 없음]
    D -->|Yes| F[YouTube Player seek<br>서버 기준 시점으로]
```

### 10.8 Host 퇴장 처리 흐름

```mermaid
sequenceDiagram
    participant Host
    participant BE as Express
    participant DB as Supabase
    participant Members as 모든 Member

    Host->>BE: Socket 연결 해제
    BE->>Members: room:host-disconnected broadcast
    BE->>BE: 1분 타이머 시작

    alt 1분 내 Host 재접속
        Host->>BE: Socket 재연결
        BE->>Members: room:host-reconnected broadcast
        BE->>BE: Room 정상 상태 복구
    else 1분 내 Host 미복귀
        BE->>DB: Room status → closed
        BE->>Members: room:closed broadcast
        BE->>DB: 모든 Member 퇴장 처리
    end
```
