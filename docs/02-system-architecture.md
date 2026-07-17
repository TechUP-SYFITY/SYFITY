# 02. System Architecture

## 1. 문서 정보

| 항목      | 내용                                                                         |
| --------- | ---------------------------------------------------------------------------- |
| 문서명    | Syfity System Architecture                                                   |
| 버전      | v2.0                                                                         |
| 상태      | 전체 제품 기능, Render·UptimeRobot 운영, Room 수명 주기 자동화 구조로 재구성 |
| 작성 목적 | Syfity 전체 시스템 구조 정의                                                 |
| 기반 문서 | `01-prd.md`                                                                  |

---

## 2. 기술 스택

| 구분          | 기술                     | 비고                                   |
| ------------- | ------------------------ | -------------------------------------- |
| FE 프레임워크 | Next.js 16 (App Router)  | Turbopack 기본 번들러                  |
| FE 상태 관리  | Zustand                  | Realtime State, Client State           |
| FE 서버 상태  | TanStack Query           | REST API 데이터                        |
| FE 스타일     | Tailwind CSS + shadcn/ui |                                        |
| FE 폼         | React Hook Form + Zod    |                                        |
| FE 테스트     | Vitest + Playwright      |                                        |
| BE 프레임워크 | Express.js + Socket.IO   | REST API + 실시간 단일 서버            |
| DB            | Supabase (PostgreSQL)    |                                        |
| ORM           | Prisma                   | 마이그레이션 + 타입 자동 생성          |
| FE 호스팅     | Vercel                   |                                        |
| BE 호스팅     | Render                   | UptimeRobot 헬스체크로 유휴 슬립 방지  |
| 가용성 점검   | UptimeRobot              | `/health` 10분 주기 확인·keep-alive    |
| 정기 작업     | GitHub Actions           | 공개 저장소의 일일 Room 수명 주기 작업 |
| 외부 API      | YouTube Data API v3      | 서버사이드 프록시                      |
| 패키지 매니저 | pnpm (workspace)         | 모노레포                               |
| 캐시          | node-cache               | 추상화하여 Redis 교체 가능하도록 설계  |

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
    Client["Browser / PWA<br>Next.js / Vercel"]
    Monitor["UptimeRobot<br>/health 10분 주기 확인"]
    Scheduler["GitHub Actions<br>일일 Room 수명 주기 작업"]

    subgraph Express["Express Server (Render)"]
        API["REST API Router<br>/auth /rooms /room-memberships<br>/rooms/:id/playlist /personal-playlists /rooms/:id/chats ..."]
        Socket["Socket.IO Server<br>room:join playback:play<br>playlist:updated chat:send ..."]
        Prisma["Prisma Client"]
        Cache["Cache Layer<br>node-cache (→ Redis 교체 가능)"]
    end

    subgraph DB["Supabase (PostgreSQL)"]
        Tables["users / rooms / room_members / recent_rooms<br>playlist_items / chat_messages<br>personal_playlists / personal_playlist_items"]
    end

    YouTube["YouTube Data API v3<br>search.list / videos.list"]

    Client -->|REST API| API
    Client -->|Socket.IO| Socket
    Monitor -->|GET /health| API
    Scheduler -->|보호된 내부 정리 API 호출| API
    API --> Prisma
    Socket --> Prisma
    Prisma --> DB
    API -->|서버사이드 프록시| YouTube
```

### 컴포넌트 역할

| 컴포넌트           | 역할                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Next.js (Vercel)   | UI 렌더링과 PWA 앱 껍데기 제공. API·Socket·YouTube·사용자별 Room 데이터는 네트워크로 조회                                       |
| Express (Render)   | REST API + Socket.IO + YouTube API 프록시 + Room 수명 주기 정리 API                                                             |
| UptimeRobot        | Render Backend의 `/health`를 10분마다 확인해 장애 알림과 유휴 슬립 방지를 수행                                                  |
| Supabase           | 영구 데이터 저장 (PostgreSQL)                                                                                                   |
| Prisma             | DB 접근 레이어, 마이그레이션 관리, 타입 생성                                                                                    |
| GitHub Actions     | 하루 한 번 보호된 내부 API를 호출해 30일 지난 closed Room을 inactive로 전환                                                     |
| Cache (node-cache) | Host·Member 연결 유예 타이머, 검색 결과, active Room의 재생·반복·셔플 상태. ICache 인터페이스로 추상화하여 추후 Redis 교체 가능 |
| YouTube Data API   | 영상 검색, 영상 정보 조회                                                                                                       |

### PWA 캐시 경계

Service Worker는 설치에 필요한 정적 에셋과 기본 앱 껍데기, 오프라인 안내 화면만 캐시한다. 인증 API, Room·Playlist·Chat API, Socket.IO, YouTube IFrame Player와 영상 데이터, 사용자별 Room 데이터는 항상 네트워크에서 가져온다. 새 버전은 사용자가 적용을 선택할 수 있도록 알리며, active Room을 자동 새로고침하지 않는다.

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
apps/frontend   → https://syfity.site
apps/backend    → https://api.syfity.site
DB              → Supabase 클라우드 (prod 프로젝트)
```

### BE 호스팅 이전 고려 사항

Render Backend는 UptimeRobot이 `/health`를 10분마다 호출하도록 구성해 유휴 슬립을 방지한다. UptimeRobot은 서비스 운영 상태 확인과 keep-alive만 담당하며, Room 상태 변경을 수행하지 않는다.

UptimeRobot 확인에도 불구하고 Render 재시작, 성능 문제가 반복되거나 상시 실행 보장이 필요해지면 AWS EC2 등 상시 실행 가능한 서버로 이전을 고려한다.

Seoul 리전 기준 EC2 온디맨드 비용은 t4g.micro가 컴퓨트 월 약 $7.59, t3.micro가 약 $8.54 수준이다. EBS와 소량 트래픽을 포함하면 총액은 월 $10~12선을 예상한다.

### 커스텀 도메인

FE의 canonical origin은 `https://syfity.site`이며, BE는 `https://api.syfity.site`를 사용한다. `www.syfity.site`는 Vercel에서 apex 도메인으로 리다이렉트하여 별도 CORS origin으로 취급하지 않는다.

```
apps/frontend   → https://syfity.site
apps/backend    → https://api.syfity.site
```

### 환경변수

**apps/frontend (.env.local)**

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

**apps/backend (.env)**

```
PORT=4000
# 운영 환경에서는 이 값의 hostname을 인증 쿠키 Domain으로도 재사용한다 (예: syfity.site)
CLIENT_URL=http://localhost:3000

# CORS 허용 origin (쉼표 구분, 로컬은 기본값으로 fallback)
# 운영: ALLOWED_ORIGINS=https://syfity.site
ALLOWED_ORIGINS=http://localhost:3000

# 특정 Vercel 프로젝트/팀 Preview URL만 허용하는 선택적 정규식
VERCEL_PREVIEW_ORIGIN_PATTERN=

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

# Supabase (로컬)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# YouTube
YOUTUBE_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback

# GitHub Actions의 Room 수명 주기 작업 호출 인증값
CRON_SECRET=
```

환경별 운영값과 각 변수의 상세 규칙은 `08-backend-architecture.md` §10을 기준으로 한다.

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

### Room 수명 주기 자동화

Room 상태 전환의 권위 판단과 실제 DB 변경은 Backend 서비스가 수행한다. GitHub Actions는 이를 실행시키는 스케줄러일 뿐, DB에 직접 접근하지 않는다.

```text
GitHub Actions (매일 UTC cron)
  → CRON_SECRET으로 보호된 Backend 내부 정리 API 호출
  → closedAt이 30일 이상 지난 closed Room을 조회
  → 각 Room을 inactive로 전환
```

- 공개 저장소의 GitHub Actions workflow에 일일 cron을 등록한다.
- 호출 URL과 인증값은 GitHub Actions Secret으로 관리하며, Backend의 `CRON_SECRET`과 일치시킨다.
- 정기 실행 지연·실패에 대비해, Host가 Home의 `내 Room` 목록을 조회하거나 closed Room 복구를 시도할 때도 같은 만료 조건을 트랜잭션으로 보정한다.
- 이 보정으로 30일 경과 시점과 실제 inactive 전환 시점 사이에 차이가 있어도, 만료된 Room을 복구하거나 계속 closed 상태로 운영할 수 없다.

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

현재는 node-cache를 사용하되, `ICache` 인터페이스로 추상화하여 추후 Redis로 교체 가능하도록 설계한다.

```
apps/backend/src/lib/cache/
  cache.interface.ts   → ICache 인터페이스 정의
  cacheKeys.ts         → 캐시 키/TTL 상수
  node-cache.store.ts  → node-cache 구현체 (현재 유일한 구현체)
  index.ts             → 구현체 주입 (교체 시 이 파일만 수정)
```

실제 사용하는 코드는 `ICache` 인터페이스만 바라보므로, Redis로 교체 시 비즈니스 로직 수정이 불필요하다. 현재 Redis 구현체(`redis.store.ts`)는 존재하지 않으며, 아래 "추후 Redis 교체 조건"이 충족될 때 추가한다.

### 캐시 사용 대상

| 용도                       | key                                      | TTL                                 |
| -------------------------- | ---------------------------------------- | ----------------------------------- |
| Host 연결 해제 유예 타이머 | `host-timer:{roomId}`                    | 60초                                |
| 멤버 연결 해제 유예 타이머 | `member-offline-timer:{roomId}:{userId}` | 없음 (재연결/타임아웃 시 수동 삭제) |
| YouTube 검색 결과          | `yt-search:{검색어}`                     | 5분                                 |
| 재생 세션                  | `playback:{roomId}`                      | Room 종료·캐시 유실 시 삭제         |

Room 상태, Playlist, 참여 이력, 채팅, 개인 Playlist는 PostgreSQL에 저장한다. 현재 곡·재생 위치·반복·셔플 설정·셔플 큐·재생 이력은 `playback:{roomId}` 인메모리 재생 세션에 함께 둔다. 캐시 miss 또는 서버 재시작은 해당 재생 세션의 종료로 처리하며, 기본값의 일시정지 상태로 새 세션을 만든다.

### 추후 Redis 교체 조건

- Render 서버 재시작 뒤 재생 세션·Host 타이머 유실을 복구해야 할 필요가 생길 때
- YouTube 검색 쿼터 소진이 빈번할 때
- 서버 인스턴스가 2개 이상으로 늘어나 재생 세션을 공유해야 할 때

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
const previewOriginPattern = compilePreviewOriginPattern();

const isAllowedOrigin = (origin: string) =>
  allowedOrigins.includes(origin) || previewOriginPattern?.test(origin) === true;
```

`*.vercel.app` 같은 전체 와일드카드는 사용하지 않는다. Vercel은 누구나 무료로 임의의 `*.vercel.app` 서브도메인을 배포할 수 있어, 와일드카드를 허용하면 `credentials: true` 쿠키와 결합해 CSRF 공격 표면이 된다. PR Preview가 필요한 경우 `VERCEL_PREVIEW_ORIGIN_PATTERN`에 해당 Vercel 프로젝트와 팀 슬러그로 범위를 제한한 **`^`/`$` 앵커 포함 정규식**을 설정한다. 정규식이 없거나, 앵커가 없거나, 잘못되면 Preview origin은 허용되지 않으며, `ALLOWED_ORIGINS`의 정확 일치 규칙만 적용된다.

```ts
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
    BE->>DB: Room + Host room_members 생성 (status: active)
    BE-->>FE: Room 정보 + 초대 코드 응답
    FE->>FE: Room Page 진입
    FE->>BE: Socket room:join 이벤트
    BE->>DB: Host 연결 상태 online 갱신
    BE-->>FE: room:joined snapshot 전송
```

### 10.2 Room 입장 흐름

```mermaid
sequenceDiagram
    actor Member
    participant FE as Next.js
    participant BE as Express
    participant DB as Supabase

    Member->>FE: 초대 코드 입력
    FE->>BE: POST /room-memberships
    BE->>DB: 초대 코드 검증 + Room 상태·Member 상태 확인
    DB-->>BE: Room active, Member가 kicked 아님 확인
    BE->>DB: room_members 생성 또는 기존 참여 이력 유지 + recent_rooms 갱신
    BE-->>FE: 기본 Room 정보 응답
    FE->>FE: Room Page 진입
    FE->>BE: Socket room:join 이벤트
    BE->>DB: Member 연결 상태 online 갱신 + Room 영속 snapshot 조회
    BE->>BE: 인메모리 재생 세션 조회 또는 기본값 생성
    BE-->>FE: room:joined snapshot 전송
    FE->>FE: 서버 기준 상태로 Player·UI 동기화
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
    participant FE_M as Next.js (Member)

    Host->>FE_H: 재생 버튼 클릭
    FE_H->>BE: Socket playback:play 이벤트
    BE->>BE: 인메모리 재생 세션 갱신<br>(baseCurrentTime, serverStartedAt, isPlaying: true)
    BE-->>FE_H: playback:play broadcast
    BE-->>FE_M: playback:play broadcast
    FE_H->>FE_H: 서버 currentTime으로 YouTube Player 동기화
    FE_M->>FE_M: 서버 currentTime으로 YouTube Player 동기화

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
    FE->>Player: 서버 currentTime으로 seek
    FE->>FE: "자동 동기화 완료" UI 표시
```

### 10.7 10초 주기 자동 보정 흐름

```mermaid
flowchart TD
    A[서버 10초 주기 broadcast<br>playback:tick]
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
        BE->>DB: Room status → closed, closedAt 기록
        BE->>Members: room:closed broadcast
        BE->>Members: Socket Room 연결 해제
    end
```

### 10.9 Room 복구와 inactive 전환 흐름

```mermaid
sequenceDiagram
    actor Host
    participant FE as Next.js
    participant BE as Express
    participant DB as Supabase

    alt 내 Room 목록 조회
        Host->>FE: 내 Room 목록 조회
        FE->>BE: GET /rooms/mine
        BE->>DB: closedAt 기준 만료 상태 보정
        BE-->>FE: active·closed Room만 반환
    else closed Room 복구 요청
        Host->>FE: 복구 선택
        FE->>BE: PATCH /rooms/:roomId { status: active }
        BE->>DB: closedAt 기준 만료 상태 보정

        alt closedAt 이후 30일 경과
            BE->>DB: Room status → inactive
            BE-->>FE: ROOM_RECOVERY_EXPIRED (409)
        else 복구 가능한 closed Room
            BE->>DB: Playlist를 트랜잭션으로 초기화
            BE->>BE: 인메모리 재생 세션 제거
            BE->>DB: Room status → active, closedAt 초기화
            BE-->>FE: 복구된 Room 반환
        end
    end
```

### 10.10 일일 inactive 전환 흐름

```mermaid
sequenceDiagram
    participant GH as GitHub Actions
    participant BE as Express
    participant DB as Supabase

    GH->>BE: 일일 cron 실행, 내부 정리 API 호출
    BE->>BE: CRON_SECRET 검증
    BE->>DB: closedAt이 30일 이상 지난 closed Room 조회
    BE->>DB: 대상 Room status → inactive
    BE-->>GH: 처리 건수 응답
```
