# 11. E2E Test Plan

## 1. 문서 정보

| 항목      | 내용                                                                         |
| --------- | ---------------------------------------------------------------------------- |
| 문서명    | Syfity E2E Test Plan                                                         |
| 버전      | v2.0                                                                         |
| 상태      | 로컬 Playwright 환경과 P0·P1 시나리오 구성 정의                              |
| 작성 목적 | 로컬 FE·BE·Docker DB 기반 Playwright E2E 환경과 검증 시나리오 정의           |
| 기반 문서 | `01-prd.md`, `05-api-spec.md`, `06-socket-event-spec.md`, `09-ui-ux-flow.md` |

---

## 2. 목표와 범위

### 2.1 목표

로컬에서 Frontend(`:3100`) · Backend(`:4100`) · Docker PostgreSQL(`:55432`)을 띄우고 핵심 사용자 흐름을 브라우저로 검증한다. 개발 스택(`:3000`/`:4000`/`:54322`)과 포트를 분리해 `pnpm dev:fe`·`pnpm dev:be`를 켜 둔 채로 실행할 수 있다.

실제 Google 로그인을 거치지 않고 테스트 전용 인증 주입으로 인증 상태를 만든다. 로컬에서 안정화한 뒤 CI에 E2E job을 추가한다(`01-prd.md` §8.2).

### 2.2 다른 테스트 계층과의 경계

E2E는 여러 계층을 실제로 연결했을 때만 드러나는 문제를 담당한다. 아래는 하위 계층 테스트가 구조적으로 잡을 수 없는 영역이다.

| 대상                                 | 하위 계층이 잡지 못하는 이유                                           |
| ------------------------------------ | ---------------------------------------------------------------------- |
| httpOnly 쿠키 전달                   | 브라우저와 Next 서버가 모두 있어야 `sameSite`·`domain` 설정이 검증된다 |
| Socket 브로드캐스트의 상대 화면 반영 | 서버 테스트는 `broadcastToRoom` 호출 여부만 확인한다                   |
| Prisma 쿼리와 실제 스키마의 정합     | 서비스 테스트는 Repository를 가짜로 주입한다                           |
| FE 타입과 BE 응답의 런타임 일치      | MSW는 클라이언트가 가정한 응답을 돌려준다                              |

반대로 순수 함수·분기 로직·컴포넌트 렌더링은 Vitest가 담당한다. E2E는 느리고 깨지기 쉬우므로 핵심 흐름만 얇게 유지한다.

### 2.3 자동화 범위

| 구분      | 대상                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 포함      | Room 생성·초대 코드 입장, Playlist 추가·삭제·순서 변경, 채팅 송수신, 참여자 표시, Host 재생 제어 명령의 Member 반영, Room 종료·나가기 |
| 제외      | Google OAuth 실제 로그인, YouTube IFrame Player의 실제 재생·광고·버퍼링, 실제 YouTube Data API 호출, PWA 설치 프롬프트                |
| 대체 수단 | 인증은 JWT 쿠키 주입, YouTube API는 Fake Client, IFrame Player는 `window.YT` 스텁                                                     |

`01-prd.md` §8.1은 자동화하기 어려운 외부 흐름을 "테스트 대체 수단과 수동 검증 범위로 분리한다"고 규정한다. 따라서 재생 동기화 명령의 전파는 자동화하고, 실제 재생 자체만 수동 검증으로 남긴다.

### 2.4 비목표

- 시각 회귀 테스트는 다루지 않는다. 컴포넌트 단위는 Storybook과 Vitest가 담당한다.
- 운영·스테이징 환경 대상 E2E는 다루지 않는다. 대상은 로컬 스택 한정이다.

---

## 3. 환경 구성

### 3.1 배치

```text
Playwright (chromium)
  → localhost:3100  Next.js production build (NEXT_PUBLIC_API_MOCKING=disabled)
       └ (server) fetch → localhost:4100/api/v1/me
  → localhost:4100  Express + Socket.IO (E2E_MODE=true)
       └ Prisma → localhost:55432  Docker PostgreSQL (syfity_e2e)
       └ YouTube → FakeYouTubeClient (네트워크 호출 없음)
```

Frontend는 `next dev`가 아니라 `next build && next start`로 띄운다. Next 16은 같은 디렉터리에서 dev 서버를 하나만 허용하므로, 개발용 dev 서버가 떠 있으면 두 번째 인스턴스가 기동하지 못한다. 포트를 나눠도 같다. 프로덕션 빌드는 배포 산출물을 검증한다는 점과 HMR로 인한 불안정이 사라진다는 점에서도 유리하다. 산출물은 `NEXT_DIST_DIR=.next-e2e`로 분리해 개발용 `.next`를 건드리지 않는다.

`app/(protected)/layout.tsx`가 Node에서 `GET /me`를 직접 호출하므로 브라우저 MSW로는 우회할 수 없다. E2E에서는 실제 Backend가 반드시 떠 있어야 하고 `NEXT_PUBLIC_API_MOCKING`은 `disabled`여야 한다.

### 3.2 Docker DB

개발용 Supabase 로컬 스택(`:54322`)과 분리된 전용 컨테이너를 쓴다. 테스트가 DB를 truncate하므로 개발 데이터와 섞이면 안 되고, Supabase 전체 스택보다 기동이 빠르다.

`docker-compose.e2e.yml`은 `postgres:17-alpine`을 `:55432`에 띄우고 볼륨을 두지 않아 `docker compose down`으로 데이터가 함께 사라진다. 스키마는 기존 마이그레이션을 그대로 적용한다.

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/syfity_e2e \
  pnpm --filter backend exec prisma migrate deploy
```

### 3.3 환경 변수

`.env.e2e` 파일은 쓰지 않는다. 레포 `.gitignore`가 `.env*`를 무시하고 예외는 `.env.example` 하나뿐이라 커밋할 수 없다. 대신 모든 값을 `e2e/support/env.ts`에 상수로 두고 `playwright.config.ts`의 `webServer.env`로 주입한다. 타입 검사를 받고 테스트 코드와 값을 공유할 수 있다.

Backend에 주입하는 값은 다음과 같다.

| 변수                                           | 값                                                          | 비고                                     |
| ---------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| `NODE_ENV`                                     | `development`                                               | 쿠키 `secure=false`, `sameSite=lax` 유지 |
| `PORT`                                         | `4100`                                                      | 개발 스택과 분리                         |
| `CLIENT_URL` · `ALLOWED_ORIGINS`               | `http://localhost:3100`                                     | CORS·쿠키 도메인 계산에 사용             |
| `DATABASE_URL`                                 | `postgresql://postgres:postgres@127.0.0.1:55432/syfity_e2e` |                                          |
| `JWT_ACCESS_SECRET` · `JWT_REFRESH_SECRET`     | 로컬 전용 더미                                              | 테스트 토큰 서명과 같은 값               |
| `CRON_SECRET` · `YOUTUBE_API_KEY` · `GOOGLE_*` | 더미                                                        | `config.ts`의 `requireEnv`가 강제        |
| `E2E_MODE`                                     | `true`                                                      | YouTube Fake 주입 스위치                 |

Frontend에는 `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_API_MOCKING=disabled`, `NEXT_DIST_DIR=.next-e2e`를 주입한다.

`server.ts`는 `import 'dotenv/config'`를 쓰지만 dotenv는 기존 `process.env`를 덮어쓰지 않으므로 주입한 값이 `.env`보다 우선한다.

---

## 4. 테스트 전용 인증 주입

### 4.1 방식

Google OAuth를 거치지 않고, Backend와 같은 시크릿으로 서명한 JWT를 브라우저 컨텍스트 쿠키에 직접 주입한다.

```text
seed: DB에 users 행 생성 (id, email, nickname)
  ↓
sign: jwt.sign({ id, email }, JWT_ACCESS_SECRET)
  ↓
storageState: access_token 쿠키 (domain=localhost, path=/, httpOnly, secure=false, Lax)
  ↓
REST(GET /me) · Socket handshake 모두 같은 쿠키로 인증 통과
```

이 방식이 성립하는 근거는 세 가지다.

- `authentication.ts`(REST)와 `socket/socketAuth.ts`(Socket)가 같은 `access_token` 쿠키를 같은 시크릿으로 검증한다. 쿠키 하나로 두 경로를 모두 덮는다.
- 쿠키는 포트를 구분하지 않으므로 `domain=localhost` 하나로 Frontend·Backend 양쪽에 전달된다.
- `authentication.ts`가 `userRepository.findUserById`로 DB를 조회하므로 사용자 시드가 선행되어야 한다. 토큰만 만들면 401이 아니라 404 `AUTH_USER_NOT_FOUND`가 난다.

### 4.2 storageState

`globalSetup`에서 고정 사용자 두 명을 시드하고 각각의 storageState를 파일로 만든다. 브라우저를 띄우지 않고 JSON을 직접 생성한다.

| 사용자   | 용도                     | 파일                    |
| -------- | ------------------------ | ----------------------- |
| `host`   | Room 생성·재생 제어·종료 | `e2e/.auth/host.json`   |
| `member` | 초대 코드 입장·수신 검증 | `e2e/.auth/member.json` |

사용자 id는 고정 UUID 상수로 둔다. `isAuthPayload`가 v4 UUID 형식을 검사하므로 형식을 지켜야 한다.

테스트 토큰의 TTL은 운영(1시간)보다 길게 잡는다. storageState는 `globalSetup`에서 한 번만 만들어지는데 `--ui` 모드는 `globalSetup`을 최초 1회만 실행한다. UI를 오래 열어 두면 토큰이 만료되고, 그러면 `/me`가 401 `AUTH_TOKEN_EXPIRED`를 반환해 클라이언트가 refresh를 시도했다가 실패한다(refresh 쿠키는 주입하지 않는다). 결과는 로그인 화면으로의 이탈이며, 테스트는 원인을 알기 어려운 "요소 없음"으로 실패한다. 만료 동작 자체는 만료된 토큰을 의도적으로 만드는 전용 시나리오로 검증한다.

### 4.3 대안 비교

| 방식                         | 장점                               | 단점                                                 | 채택 |
| ---------------------------- | ---------------------------------- | ---------------------------------------------------- | ---- |
| JWT 쿠키 직접 주입           | BE 코드 변경 없음, Socket까지 커버 | 시크릿을 테스트 코드가 알아야 함(로컬 전용이라 무해) | O    |
| `POST /auth/test-login` 추가 | 테스트 코드가 단순                 | 운영 번들에 인증 우회 엔드포인트가 들어감            | X    |
| Google OAuth 실제 수행       | 가장 현실적                        | 자동화 불가·불안정, PRD가 명시적으로 제외            | X    |

---

## 5. 외부 의존 대체

### 5.1 YouTube Data API

검색과 곡 추가는 서버가 YouTube를 호출하므로 브라우저 `page.route`로는 막을 수 없다. 클라이언트 구현 자체를 교체한다.

분기는 `createYouTubeClient` 팩토리 한 곳에만 둔다. `ioc.ts`가 직접 `new`를 호출하면 분기가 여러 곳으로 퍼지고 운영 가드도 테스트하기 어려워진다.

```ts
// apps/backend/src/lib/youtube/youtube.factory.ts
export function createYouTubeClient({ apiKey, nodeEnv, e2eMode }: YouTubeClientOptions) {
  if (e2eMode && nodeEnv !== 'production') {
    logger.warn('[youtube] E2E_MODE가 켜져 있어 FakeYouTubeClient를 사용합니다.');
    return new FakeYouTubeClient();
  }
  return new YouTubeClient(apiKey);
}
```

운영에서는 `E2E_MODE`가 어떤 값이든 무시한다. 스텁이 운영에 새면 검색과 곡 추가가 조용히 가짜 데이터를 반환하므로, 환경변수 설정 실수에 대한 방어선을 두고 단위 테스트로 고정한다.

고정 카탈로그(`FAKE_YOUTUBE_CATALOG`)는 12건이다.

| videoId                       | 용도                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| `e2eTrack001` ~ `e2eTrack010` | 정상 음악(카테고리 10, embeddable). duration 181~190초로 서로 다름 |
| `e2eNoEmbed1`                 | 임베드 불가 → 곡 추가 시 `PLAYLIST_VIDEO_UNAVAILABLE`              |
| `e2eNonMusic`                 | 음악 카테고리 아님 → `SearchService`의 카테고리 필터에서 제외      |
| 카탈로그에 없는 id            | 빈 결과 → "재생할 수 없는 영상" 흐름                               |

`search(query)`는 제목·채널명 부분 일치로 동작하고, 일치가 없으면 빈 배열을 반환해 검색 결과 없음 상태도 만들 수 있다. videoId는 실제 YouTube와 같은 11자를 유지한다. 썸네일은 1x1 투명 PNG data URI다. 실제 URL을 쓰면 브라우저가 외부 이미지를 받아와 외부 요청 0 원칙이 깨진다.

검증은 두 층으로 한다. 백엔드 단위 테스트가 스텁 동작과 운영 가드를 고정하고, `youtube-stub.e2e.ts`가 `E2E_MODE`의 배선(env → config → 팩토리)을 확인한다. 두 번째 층이 없으면 `E2E_MODE`가 빠졌을 때 이후 모든 시나리오가 조용히 실제 API를 호출한다.

### 5.2 YouTube IFrame Player

`YouTubePlayer.tsx`는 `window.YT?.Player`가 이미 있으면 스크립트를 주입하지 않고 즉시 진행한다. 그래서 페이지 스크립트보다 먼저 `window.YT`를 심으면 `iframe_api` 요청 자체가 발생하지 않는다.

스텁은 `loadVideoById`·`cueVideoById`·`playVideo`·`pauseVideo`·`seekTo`·`getCurrentTime` 등을 메모리 상태로 구현하고, 현재 상태를 DOM 속성으로 노출한다.

| 속성                      | 의미                 |
| ------------------------- | -------------------- |
| `data-e2e-youtube-player` | 플레이어 마운트 완료 |
| `data-e2e-video-id`       | 현재 로드된 videoId  |
| `data-e2e-playing`        | 재생 중 여부         |

`page.route`로 `youtube.com`·`ytimg.com`·`googlevideo.com` 요청을 차단하는 것은 이중 방어다. 스텁이 정상이면 요청 자체가 없지만, 스텁이 깨졌을 때 조용히 실제 YouTube로 나가는 대신 테스트가 실패하게 만든다.

### 5.3 공통 진입점

모든 스펙은 `@playwright/test`가 아니라 `e2e/fixtures/test.ts`에서 `test`를 가져온다. 외부 의존 차단을 각 스펙이 기억해서 처리해야 한다면 언젠가 빠뜨리므로, 진입점을 하나로 두고 기본값으로 강제한다.

이 모듈은 세 가지를 제공한다.

- `page` — 플레이어 스텁이 이미 설치된 페이지
- `externalRequests` — 로컬 스택 밖으로 나간 요청 목록. 비어 있는지 단언하는 데 쓴다
- `openPageAs(user)` — 지정한 사용자로 로그인된 새 페이지. Host와 Member 화면을 동시에 확인하는 시나리오에 쓴다

---

## 6. 디렉터리 구조와 설정

FSD 폴더 구조(`07-frontend-architecture.md` §3)는 `apps/frontend/src/` 내부만 규정하므로 `src/` 바깥의 `e2e/`는 해당 규칙과 충돌하지 않는다. 별도 workspace 패키지를 만들지 않는 이유는 Playwright가 이미 `apps/frontend`의 devDependency이기 때문이다.

```text
apps/frontend/
  playwright.config.ts
  e2e/
    .auth/                    → storageState (gitignore)
    fixtures/
      test.ts                 → 공통 진입점 (스텁 자동 적용, openPageAs, externalRequests)
      youtube-player.ts       → IFrame API 스텁
    setup/
      global-setup.ts         → DB reset + 사용자 시드 + storageState 생성
    support/
      env.ts                  → 포트·시크릿·테스트 사용자 상수, webServer용 env 묶음
      auth.ts                 → JWT 서명 + 쿠키·storageState 생성
      db.ts                   → pg 직결 truncate·시드
      api.ts                  → 사전 조건을 REST로 생성 (Room·입장·곡 추가)
      pages.ts                → 페이지 진입 헬퍼 (하이드레이션 대기 포함)
      room-session.ts         → 2인 Room 세션 구성과 패널 로케이터
    specs/
      auth-guard.e2e.ts       → E-01
      room-create.e2e.ts      → E-02
      room-join.e2e.ts        → E-03
      room-playlist.e2e.ts    → E-04
      room-chat.e2e.ts        → E-05
      room-playback.e2e.ts    → E-06
      room-close.e2e.ts       → E-07
      room-reorder.e2e.ts     → E-08
      room-join-errors.e2e.ts → E-09
      room-leave.e2e.ts       → E-12
      room-kick.e2e.ts        → E-10
      personal-playlist.e2e.ts → E-11
      home-rooms.e2e.ts       → E-13
      mobile-tabs.e2e.ts      → E-14
      host-connection.e2e.ts  → E-15
      youtube-stub.e2e.ts     → YouTube 스텁 배선
      room-player-stub.e2e.ts → 외부 요청 차단
docker-compose.e2e.yml
```

`playwright.config.ts`의 주요 설정은 다음과 같다.

| 항목        | 값                                      | 이유                                                                        |
| ----------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `testDir`   | `./e2e/specs`                           | Vitest와 물리적으로 분리                                                    |
| `testMatch` | `*.e2e.ts`                              | Vitest 기본 include가 `**/*.{test,spec}.*`라 `.spec.ts`는 Vitest가 수집한다 |
| 인증 분리   | spec별 `test.use({ storageState })`     | 사용자 조합이 spec마다 달라 프로젝트로 나누면 조합이 늘어난다               |
| `workers`   | 1                                       | 단일 DB·단일 Socket 서버를 공유한다. 병렬화는 안정화 후 검토                |
| `viewport`  | 1440x900                                | Room의 멤버·채팅 패널은 Tailwind `xl`(1280px) 이상에서만 펼쳐진다           |
| `webServer` | FE·BE 두 개, `reuseExistingServer: !CI` | 로컬 반복 실행 시 재기동 비용 제거                                          |
| `retries`   | 로컬 0 / CI 1                           | 로컬에서 불안정을 숨기지 않는다                                             |
| `timeout`   | test 30s, expect 5s                     | 실시간 전파 대기 여유                                                       |

Backend 기동 명령에는 `prisma generate`를 포함한다. `src/generated/`는 gitignore 대상이라 로컬 산출물이 스키마보다 뒤처질 수 있고, 그 상태에서는 enum 누락 같은 문제가 런타임 500으로만 드러난다.

함께 조정해야 하는 설정은 다음과 같다.

| 파일                | 변경                                           | 이유                                                 |
| ------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `vitest.config.mts` | `exclude`에 `e2e/**`                           | Vitest가 E2E 파일을 수집하지 않도록 이중 방어        |
| `eslint.config.mjs` | `globalIgnores`에 `.next-e2e/**` 등            | 빌드 산출물을 린트해 대량 오류가 나는 것을 방지      |
| `eslint.config.mjs` | `e2e/**`에서 `react-hooks/rules-of-hooks` 해제 | Playwright fixture의 `use`를 React Hook으로 오인한다 |
| `next.config.ts`    | `distDir: process.env.NEXT_DIST_DIR`           | 개발용 `.next`와 산출물 분리                         |
| `tsconfig.json`     | `.next-e2e/types/**` include                   | `next build`가 자동 추가하므로 커밋해 둔다           |
| `.gitignore`        | `.next-e2e/`, `e2e/.auth/`, `test-results/`    | 산출물·인증 상태 파일 제외                           |

---

## 7. 데이터 시드와 격리

| 단계                 | 동작                                                            |
| -------------------- | --------------------------------------------------------------- |
| `globalSetup`        | 전체 테이블 truncate 후 고정 사용자 2명 시드, storageState 생성 |
| 각 spec `beforeEach` | `users`를 제외한 Room 관련 테이블만 정리                        |

시나리오 데이터는 검증 대상인 흐름은 UI로, 사전 조건일 뿐인 데이터는 REST API로 만든다. 예를 들어 Room 생성 자체를 검증하는 E-02는 UI로 방을 만들고, 재생 제어를 검증하는 E-06은 곡을 REST로 넣는다. DB 직접 시드는 REST로 만들 수 없는 상태에만 쓴다.

Backend는 `node-cache`로 재생 세션과 참여자 상태를 들고 있다. DB만 비우면 캐시가 남으므로 spec 간 Room id를 재사용하지 않는다. 테스트마다 새 Room을 만드는 편이 서버 재기동보다 싸고 확실하다.

---

## 8. 시나리오

### 8.1 P0 — 핵심 흐름

| ID   | 시나리오           | 핵심 단언                                                                 |
| ---- | ------------------ | ------------------------------------------------------------------------- |
| E-01 | 인증 가드          | 쿠키 유무에 따른 리다이렉트, 인증 시 닉네임 렌더, 만료 토큰의 로그인 복귀 |
| E-02 | Room 생성·입장     | 초대 코드 노출, `/room/:id` 진입, 생성자가 Host                           |
| E-03 | 초대 코드 참여     | 양쪽 참여자 목록 갱신, 입장 시스템 메시지                                 |
| E-04 | Playlist 추가·삭제 | 두 화면 실시간 반영, 임베드 불가 곡 거절, 검색 결과 없음                  |
| E-05 | 채팅 송수신        | 상대 화면 도착과 작성자 표시, 순서 유지, 공백 트리밍                      |
| E-06 | 재생 제어 전파     | 양쪽 현재 곡·재생 상태 일치, 곡 이동, Member 제어 비활성                  |
| E-07 | Room 종료          | 양쪽 Home 이동, 취소 시 잔류, 종료된 Room 재입장 거부                     |

### 8.2 P1

| ID   | 시나리오                                                     |
| ---- | ------------------------------------------------------------ |
| E-08 | Playlist 순서 변경과 Member 제어 UI 미노출                   |
| E-09 | 잘못된 초대 코드와 입력 검증                                 |
| E-10 | Member 추방·해제와 재입장 거부, 멤버 관리 수단 미노출        |
| E-11 | 개인 Playlist 생성·삭제·곡 관리, Room 불러오기의 Member 전파 |
| E-12 | Member 나가기와 재입장                                       |
| E-13 | 종료 Room 복구·비활성화, 최근 참여 방 재입장                 |
| E-14 | 모바일 뷰포트 하단 탭 전환과 데스크톱 패널 미노출            |
| E-15 | Host 연결 끊김 안내와 재접속 시 해제                         |

### 8.3 미착수

현재 미착수 시나리오는 없다. E-09는 나머지 오류 흐름만 다룬다.

### 8.4 다중 사용자 시나리오

한 컨텍스트에서 사용자를 바꿀 수 없으므로 사용자마다 별도 BrowserContext를 만든다. `openPageAs` fixture가 컨텍스트 생성·스텁 설치·정리를 담당한다. 컨텍스트를 닫아야 Socket 연결이 끊기므로, 정리를 빠뜨리면 다음 테스트의 접속자 수가 어긋난다.

Host와 Member가 같은 Room에 들어와 있는 상태는 `support/room-session.ts`의 `openRoomWithHostAndMember`로 만든다. Host의 Socket이 Room에 붙은 뒤에 Member를 넣어야 Host가 전파를 받는다.

---

## 9. 작성 규칙

### 9.1 대기

고정 대기(`waitForTimeout`)를 쓰지 않는다. Socket 전파는 `expect(locator)`의 자동 재시도로만 기다린다. 값을 계산해서 비교해야 하면 `expect.poll`을 쓴다.

페이지 진입 직후 클릭은 하이드레이션을 기다린 뒤에 한다. 프로덕션 빌드는 완성된 HTML을 먼저 보내므로 버튼이 이미 DOM에 있고 Playwright의 actionability 검사를 통과한다. 그러나 React가 아직 핸들러를 붙이기 전이면 클릭이 조용히 무시되고, 실패는 "다이얼로그가 열리지 않음 → 타임아웃"으로만 나타난다. `support/pages.ts`의 진입 헬퍼가 페이지별로 클라이언트 JS가 실행되었다는 신호를 기다린다.

| 페이지    | 하이드레이션 신호                                   |
| --------- | --------------------------------------------------- |
| Home      | 닉네임(클라이언트 `useMe`가 해석한 뒤에만 나타난다) |
| Room      | 플레이어 스텁 요소(클라이언트에서만 붙는다)         |
| Room Join | 입장 다이얼로그(Radix Portal이라 서버 HTML에 없다)  |

### 9.2 셀렉터

`getByRole`·`getByLabel`·`getByText`를 우선한다. 역할과 텍스트로 특정하기 어려운 목록 항목에만 `data-testid`를 쓴다. E2E를 위해 프로덕션 마크업을 크게 바꾸지 않는다.

실제로 부딪힌 함정은 다음과 같다.

| 상황                                                                | 대응                                                                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Room의 멤버·재생목록·채팅 패널이 모두 이름 없는 `complementary`     | 내용으로 좁힌다(`support/room-session.ts`의 패널 헬퍼)                                                             |
| 초대 다이얼로그가 모바일용·데스크톱용 마크업을 둘 다 렌더           | `filter({ visible: true })`                                                                                        |
| 토스트가 화면 요소와 스크린리더 live region에 이중으로 그려짐       | `{ exact: true }`. live region은 1x1 clip이지만 Playwright는 visible로 판정하므로 visible 필터로는 걸러지지 않는다 |
| 부분 일치가 의도치 않은 요소까지 잡음(`Room 종료`↔`Room 종료 확인`) | `exact: true`                                                                                                      |
| 닉네임이 시스템 메시지와 작성자 표시 양쪽에 존재                    | 메시지를 감싼 블록으로 범위를 좁힌 뒤 작성자를 확인                                                                |

### 9.3 부정 단언

"없어야 한다"는 단언은 대상이 아직 나타나지 않았을 때도 통과한다. 서버가 실제로 거절했다는 신호를 먼저 기다린 뒤에 부재를 확인한다. 예를 들어 임베드 불가 곡 추가는 오류 토스트를 먼저 기다리고, 검색 결과 없음은 빈 상태 문구를 먼저 기다린다.

### 9.4 역할별 분기

같은 조작이 역할에 따라 다르게 동작하는 곳이 있다. 곡 추가 버튼은 Host에게 드롭다운(검색으로 추가 / 내 플레이리스트 불러오기)을, 그 외에는 검색 패널을 바로 연다. 헬퍼는 어느 쪽이 나타나는지 기다린 뒤 분기해 두 경우를 모두 처리한다.

---

## 10. 실행

```bash
pnpm e2e            # DB 기동 → 마이그레이션 → FE·BE 기동 → 테스트
pnpm e2e:ui         # Playwright UI 모드
pnpm e2e:db:up      # E2E 전용 PostgreSQL 기동
pnpm e2e:db:down    # 컨테이너와 데이터 제거
pnpm e2e:db:migrate # 스키마 적용
```

최초 1회는 `pnpm --filter frontend exec playwright install chromium`으로 브라우저를 받는다.

`webServer`가 Frontend·Backend를 알맞은 환경변수로 기동하므로 `pnpm e2e` 하나로 충분하다. `dotenv-cli` 같은 추가 의존성은 쓰지 않는다. 셸의 인라인 env 할당으로 충분하고 `prisma.config.ts`의 `dotenv/config`는 기존 env를 덮어쓰지 않는다.

실패하면 `apps/frontend/test-results/<테스트명>/error-context.md`에 실패 시점의 페이지 스냅샷이 남는다. 같은 폴더의 영상과 재시도 시의 trace도 원인 파악에 쓴다.

E2E 서버는 `reuseExistingServer` 때문에 테스트 후에도 떠 있다. 프로덕션 빌드라 HMR이 없으므로, 코드를 고쳤는데 반영되지 않으면 `:3100`·`:4100` 프로세스를 종료하고 다시 실행한다.

---

## 11. CI 통합

`01-prd.md` §8.2를 따른다. 로컬 시나리오가 안정화된 뒤에 착수한다.

현재 `ci.yml`에는 `changes`(dorny/paths-filter) · `lint-be` · `lint-fe` · `build-fe` 네 개의 job이 있다. E2E job은 기존 `changes` job의 출력을 재사용해 Frontend·Backend·shared·공통 설정 변경일 때만 실행한다. 문서만 변경한 PR은 건너뛴다.

- DB는 GitHub Actions `services: postgres:17`로 대체한다(로컬 compose와 같은 자격 증명·포트 매핑).
- `playwright install --with-deps chromium`으로 chromium만 설치한다.
- 실패 시 `playwright-report`와 trace를 artifact로 업로드한다.
- CI에서는 `reuseExistingServer: false`, `retries: 1`, `workers: 1`.
- E2E 파일도 타입 검사 대상이다. Playwright는 타입 검사 없이 트랜스파일하므로 `tsc --noEmit`을 함께 실행한다.
- 기존 job과 병렬로 두되, 필수 체크 전환은 일정 기간 관찰 후 결정한다.

---

## 12. 리스크와 미결정 사항

### 12.1 리스크

| 리스크                                | 영향                 | 대응                                                         |
| ------------------------------------- | -------------------- | ------------------------------------------------------------ |
| Socket 전파 타이밍으로 인한 불안정    | 간헐 실패            | 고정 대기 금지, 자동 재시도 단언만 사용                      |
| `node-cache` 잔존 상태가 spec 간 누수 | 재현 어려운 실패     | 테스트마다 새 Room 생성, Room id 재사용 금지                 |
| `E2E_MODE` 분기가 운영에 새는 것      | 보안·동작 리스크     | 분기를 팩토리 한 곳으로 제한, 운영 가드를 단위 테스트로 고정 |
| 매 실행 `next build`로 실행 시간 증가 | 개발 경험 저하       | 현재 전체 40초 안팎. 길어지면 E2E 스택 상주 스크립트 검토    |
| 테스트용 JWT 시크릿 노출              | 없음(로컬 전용 더미) | 운영 시크릿과 공유하지 않는다                                |

### 12.2 미결정 사항

- 문서 번호를 `11-`로 둘지 운영 계열로 옮길지. README 문서 표 갱신 시 함께 결정한다.
- 브라우저 매트릭스. 1차는 chromium 단일이며 WebKit·Firefox 추가 여부는 안정화 이후 검토한다.
- `next build` 반복 비용이 부담되면 E2E 스택을 띄워 두는 스크립트를 추가하고 `pnpm e2e`가 이를 재사용하게 한다.

### 12.3 E2E 범위 밖 후속 작업

`apps/frontend/src/features/player/lib/`의 `playerSync.ts`(재생 위치 오차 보정)와 `playbackCommands.ts`에는 단위 테스트가 없다. 순수 함수는 단위 테스트가 가장 싸고 E2E가 가장 비싼 대상이므로 Vitest로 메운다. 재생 동기화의 10초 tick 주기와 2초 임계값도 E2E가 아니라 `tick.handler.test.ts`가 담당한다.
