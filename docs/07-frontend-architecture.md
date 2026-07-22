# 07. Frontend Architecture

## 1. 문서 정보

| 항목      | 내용                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| 문서명    | Syfity Frontend Architecture                                                          |
| 버전      | v2.1                                                                                  |
| 상태      | 온보딩·계정 화면과 YouTube 계약 준수 UI 구조 추가                                     |
| 작성 목적 | Syfity 프론트엔드 구조 정의                                                           |
| 기반 문서 | `01-prd.md`, `02-system-architecture.md`, `05-api-spec.md`, `06-socket-event-spec.md` |

---

## 2. 기술 스택

| 항목                | 기술                     | 비고                                     |
| ------------------- | ------------------------ | ---------------------------------------- |
| 프레임워크          | Next.js 16 (App Router)  | Turbopack 기본 번들러                    |
| 언어                | TypeScript               |                                          |
| 상태 관리           | Zustand                  | Realtime State, Client State             |
| 서버 상태           | TanStack Query           | REST API 데이터                          |
| Socket              | Socket.IO Client         | Singleton 모듈로 관리                    |
| 스타일              | Tailwind CSS             |                                          |
| 컴포넌트 라이브러리 | shadcn/ui                | Tailwind + Radix UI 기반, 코드 직접 소유 |
| 폼                  | React Hook Form + Zod    |                                          |
| YouTube Player      | @types/youtube           | IFrame Player API 타입                   |
| 단위 테스트         | Vitest + Testing Library |                                          |
| E2E 테스트          | Playwright               | 로컬 FE·BE·Docker DB 기반 핵심 흐름 검증 |
| 컴포넌트 문서화     | Storybook                | 디자인 시스템 컴포넌트 확인용            |
| 패키지 매니저       | pnpm                     | 모노레포 workspace                       |

---

## 3. 폴더 구조

FSD(Feature Sliced Design)를 Syfity에 맞게 간소화하여 적용한다. 원본 FSD의 `entities`와 `features`를 `features`로 통합한다. 여러 feature를 조합하는 복합 UI는 `widgets` 레이어에 둔다. Room Page는 `widgets/room`에서 `room`/`player`/`playlist`/`chat`/`presence` feature를 조합한다.

```
apps/frontend/
  src/
    app/                      → Next.js App Router 페이지 및 레이아웃
      (auth)/
        callback/
          page.tsx            → Google OAuth 콜백 처리
      (protected)/
        settings/             → 계정 설정 화면
        home/
          page.tsx            → Home Page
        room/
          join/
            page.tsx          → 초대 링크 진입점 (/room/join?code=ABC123)
          [roomId]/
            page.tsx          → roomId를 Room widget에 전달
      manifest.ts             → Web App Manifest
      offline/
        page.tsx              → 오프라인 안내 화면
      page.tsx                → Landing widget 렌더링
      onboarding/             → 최초 로그인 온보딩
      terms/, privacy/        → 공개 약관·개인정보처리방침
      layout.tsx              → Root 레이아웃
      proxy.ts                → Route 보호 (쿠키 존재 여부 체크)

    features/                 → 기능 단위 모듈 (FSD features + entities 통합)
      auth/                   → 인증 도메인
      room/                   → Room REST·입장·상태 도메인
      player/                 → 재생 제어·상태 도메인
      playlist/               → 재생목록 도메인
      personal-playlist/      → 나만의 Playlist CRUD·Room 불러오기 도메인
      chat/                   → 채팅 도메인
      presence/               → 참여자 상태 도메인
      search/                 → YouTube 검색 도메인

    widgets/                  → 여러 feature를 조합하는 복합 UI
      landing/                → Landing 화면 조립 UI
      home/                   → Home 화면 조립 UI
      room/                   → Room Page·세션 조립 UI (RoomShell, 반응형 레이아웃)
      pwa/                    → 설치·업데이트 안내 전역 UI

    shared/                   → 공통 모듈
      components/             → 공통 UI 컴포넌트 (디자인 시스템 문서 참조)
      hooks/                  → 공통 훅
      lib/
        api/                  → apiClient.ts (fetch wrapper)
        socket/               → socketClient.ts (Socket.IO singleton)
        query/                → queryClient.ts (TanStack Query 설정)
        pwa/                  → Service Worker 등록·업데이트 감지 순수 로직
      types/                  → 공통 타입 (shared 패키지에서 import)
```

### feature slice 구조

각 feature는 아래 slice 중 필요한 것만 선택하여 구성한다.

```
{feature}/
  api/        → REST API 함수
  hooks/      → 커스텀 훅
  store/      → Zustand store
  components/ → feature 전용 컴포넌트
  types/      → feature 전용 타입
  lib/        → feature 전용 순수 로직
  constants/  → feature 전용 상수
```

### feature별 slice 구성

| feature           | api | hooks | store | components | types | lib/constants |
| ----------------- | --- | ----- | ----- | ---------- | ----- | ------------- |
| auth              | O   | O     | X     | O          | X     | X             |
| room              | O   | O     | O     | O          | O     | X             |
| player            | X   | O     | O     | O          | O     | O             |
| playlist          | O   | O     | O     | O          | O     | X             |
| personal-playlist | O   | O     | X     | O          | O     | X             |
| chat              | O   | O     | O     | O          | X     | O             |
| presence          | O   | O     | O     | O          | O     | X             |
| search            | O   | O     | X     | O          | X     | X             |

- `auth` store X → 사용자 정보는 TanStack Query (`useMe`)로 관리
- `player` api X → 재생 제어는 Socket 이벤트로 처리
- `presence` → 현재 참여자 표시는 Socket 이벤트로 관리하고, Host의 추방 목록 조회·추방·해제는 REST API로 관리
- `search` store X → 검색 결과는 TanStack Query로 캐싱
- `personal-playlist` store X → 목록·상세는 TanStack Query로 관리하고, 불러오기 결과 UI는 컴포넌트 로컬 상태로 관리

### 레이어 규칙

레이어 간 단방향 의존을 원칙으로 한다.

```
app → widgets → features → shared
```

- `shared`에서 `features`/`widgets` import 금지
- `features`에서 `widgets` import 금지
- `features` 간 직접 import 금지 (공통 로직은 `shared`로 이동)
- `widgets`는 화면 흐름을 조합하며, 여러 feature를 연결하는 페이지 단위 상태·효과를 둘 수 있음

**app (page / layout)**

- 라우트, params, layout, 오류 경계만 담당
- feature/widget의 데이터 페칭·클라이언트 상태를 직접 소유하지 않음
- Server Component 기본

`(protected)/layout.tsx`는 `/me`의 `onboardedAt`을 확인해 미완료 사용자를 `/onboarding`으로 보낸다. Edge `proxy.ts`는 `/onboarding`, `/settings`, `/playlists`도 쿠키 단계에서 보호한다. 프로필 이미지는 signed URL로 Supabase Storage에 직접 업로드하고 `ProfileImagePicker`를 온보딩·계정 화면에서 공유한다. YouTube `rel: 0`은 관련 영상을 완전히 차단하지 않고 같은 채널 영상으로 제한한다.

**widgets**

- 여러 feature 컴포넌트와 훅을 조합하는 화면 단위 UI 담당
- 페이지 진입·이탈에 결합된 데이터 초기화, 여러 feature를 잇는 Socket 연결, 화면 전용 로컬 상태를 소유할 수 있음
- 도메인 API·store·Socket 이벤트의 구현은 feature에 둠

**features / hooks**

- TanStack Query, Zustand, Socket 이벤트 구독 담당
- 비즈니스 로직은 훅에서 처리
- 컴포넌트는 훅에서 데이터를 받아 UI 렌더링만 담당

**features / components**

- UI 렌더링만 담당
- 비즈니스 로직 없음
- 데이터는 훅에서 주입받음

**shared / lib**

- `apiClient`, `socketClient`, `queryClient` 등 공통 클라이언트 모듈
- feature에서 직접 `fetch` 호출 금지, 반드시 `apiClient` 사용

---

## 4. 페이지 구조

| 경로             | 페이지         | 인증 필요 | 설명                                              |
| ---------------- | -------------- | --------- | ------------------------------------------------- |
| `/`              | Landing        | X         | 서비스 소개, Google 로그인 버튼                   |
| `/auth/callback` | OAuth Callback | X         | Google OAuth 콜백 처리, JWT 발급 후 리다이렉트    |
| `/home`          | Home           | O         | Room 생성, 초대 코드 입력, 최근 Room·내 Room 관리 |
| `/room/join`     | Room Join      | O         | 초대 링크 진입점 (`?code=ABC123`)                 |
| `/room/[roomId]` | Room           | O         | 음악 감상, Playlist, Chat, Presence               |
| `/offline`       | Offline        | X         | 네트워크 연결 필요 안내                           |

---

## 5. Route 보호

### 5.1 proxy.ts (쿠키 존재 여부 체크)

`proxy.ts`는 쿠키 존재 여부만 확인한다. 실제 JWT 검증은 수행하지 않는다.

```ts
// src/app/proxy.ts
import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('access_token');
  if (!token) {
    const returnUrl = request.nextUrl.pathname + request.nextUrl.search;
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('returnUrl', returnUrl);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/home', '/room/:path*'],
};
```

### 5.2 layout.tsx (실제 JWT 검증)

보호된 페이지의 layout.tsx에서 Server Component로 실제 인증 검증을 수행한다.

```ts
// src/app/(protected)/layout.tsx
export default async function ProtectedLayout({ children }) {
  const me = await getMe(); // 서버에서 GET /me 호출
  if (!me) redirect('/');
  return <>{children}</>;
}
```

---

## 6. 상태 관리 전략

| 상태 유형      | 관리 방식      | 대상 데이터                                                     |
| -------------- | -------------- | --------------------------------------------------------------- |
| Server State   | TanStack Query | 최근 Room·내 Room·개인 Playlist, 사용자 정보, YouTube 검색 결과 |
| Realtime State | Zustand        | 인메모리 PlaybackState snapshot, Playlist, Chat, Presence       |
| Client State   | Zustand 우선   | 여러 컴포넌트가 공유하는 UI 상태 (모달, 탭 등)                  |
| Local State    | React useState | 단일 컴포넌트 내부 상태 (input 값, hover 등)                    |

### Zustand store 구조 원칙

- feature별로 store를 분리한다.
- Socket 이벤트 수신 시 해당 store를 직접 업데이트한다.
- store에 Socket 인스턴스를 저장하지 않는다. Socket 인스턴스는 `socketClient`에서 관리한다.

---

## 7. API 클라이언트

### 7.1 fetch wrapper

REST API 호출을 추상화한다. 401 감지 시 `/auth/refresh`를 자동으로 호출하고 재시도한다.

```ts
// shared/lib/api/apiClient.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

async function request<T>(url: string, options?: RequestInit, hasRetried = false): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (response.status === 401 && !payload.success) {
    const { code } = payload.error;

    if ((code === 'AUTH_UNAUTHORIZED' || code === 'AUTH_TOKEN_EXPIRED') && !hasRetried) {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!refreshRes.ok) {
        const refreshPayload = (await refreshRes.json()) as ApiFailure;
        if (refreshPayload.error.code === 'AUTH_REFRESH_EXPIRED') {
          window.location.href = '/login?reauth=1';
        }
        throw refreshPayload.error;
      }

      return request<T>(url, options, true);
    }

    if (hasRetried) {
      window.location.href = '/login?reauth=1';
    }
  }

  if (!response.ok) {
    if (!payload.success) throw payload.error;
    throw new Error(`HTTP ${response.status}`);
  }

  if (!payload.success) throw payload.error;
  return payload.data;
}

export const apiClient = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
```

### 7.2 도메인별 API 함수

각 feature에서 `apiClient`를 직접 쓰지 않고 도메인별 API 함수로 한 번 더 추상화한다.

```ts
// features/room/api/roomApi.ts
export const roomApi = {
  createRoom: (name: string) => apiClient.post('/rooms', { name }),
  joinRoom: (inviteCode: string) => apiClient.post('/room-memberships', { inviteCode }),
  getRecentRooms: () => apiClient.get('/rooms/recent'),
  getMyRooms: () => apiClient.get('/rooms/mine'),
  updateRoom: (roomId: string, body: { name?: string; status?: 'active' | 'closed' }) =>
    apiClient.patch(`/rooms/${roomId}`, body),
  deleteRoom: (roomId: string) => apiClient.delete(`/rooms/${roomId}`),
};
```

---

## 8. Socket 클라이언트

Socket.IO 인스턴스를 Singleton 모듈로 관리한다. React 생명주기와 독립적으로 동작하여 컴포넌트 리렌더링 시 연결이 끊기지 않는다.

```ts
// shared/lib/socket/socketClient.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL!;

let socket: Socket | null = null;

export const socketClient = {
  getOrCreate: () => {
    if (!socket) {
      socket = io(SOCKET_URL, { withCredentials: true, autoConnect: false });
    }
    return socket;
  },
  disconnect: () => {
    socket?.disconnect();
    socket = null;
  },
  get: () => socket,
};
```

### Room 세션 연결/해제 시점

라우트의 `page.tsx`는 `roomId`만 Room widget에 전달한다. `widgets/room/RoomSessionProvider`는 feature store의 공개 액션을 조합해 Socket 세션을 관리한다. `room:joined` 구독을 먼저 등록하고 Socket 연결·`room:join`을 실행해 snapshot 유실을 막는다.

- 초대 코드 진입은 Room Join 화면에서 `POST /room-memberships` 성공 뒤 Room 경로로 이동한다.
- 최근 Room·내 Room의 직접 진입은 기존 참여 이력을 사용해 Socket `room:join`만 실행한다.
- 페이지 unmount는 Socket 연결만 해제한다. `room:leave`는 자동 전송하지 않는다.
- `room:leave`는 사용자가 명시적으로 나가기 버튼을 누를 때만 전송한다. Host의 명시적 나가기는 즉시 Room Close이므로, 일반 라우트 이탈과 구분해야 한다.

```ts
// widgets/room/RoomSessionProvider.tsx
'use client';

export function RoomSessionProvider({ roomId, children }) {
  useEffect(() => {
    const socket = socketClient.getOrCreate();

    const handleJoined = (snapshot) => {
      // Player·Playlist·Chat·Presence store 공개 액션에 snapshot 반영
    };
    const handleClosed = () => {
      // Room 상태 정리 후 Home 이동
    };
    const handleKicked = () => {
      // 추방 안내 후 Home 이동
    };
    const handlePlaybackReset = (payload) => {
      // 기본 재생 상태로 Player store 초기화
    };

    socket.on('room:joined', handleJoined);
    socket.on('room:closed', handleClosed);
    socket.on('room:kicked', handleKicked);
    socket.on('playback:reset', handlePlaybackReset);
    socket.connect();
    socket.emit('room:join', { roomId });

    return () => {
      socket.off('room:joined', handleJoined);
      socket.off('room:closed', handleClosed);
      socket.off('room:kicked', handleKicked);
      socket.off('playback:reset', handlePlaybackReset);
      socketClient.disconnect();
    };
  }, [roomId]);

  return <>{children}</>;
}
```

```ts
// widgets/room/RoomPage.tsx
export function RoomPage({ roomId }) {
  return <RoomSessionProvider roomId={roomId}>{/* Room page UI */}</RoomSessionProvider>;
}
```

### Socket 이벤트 구독

`RoomSessionProvider`는 Room 전체 snapshot과 전역 종료 이벤트를 처리한다. 각 feature hook은 자신이 소유한 이후 이벤트만 구독한다. store 초기화 시점에 구독하면 Socket이 아직 `null`일 수 있으므로 반드시 hook에서 구독한다.

```ts
// features/player/hooks/usePlaybackSocket.ts
'use client';

export function usePlaybackSocket() {
  useEffect(() => {
    const socket = socketClient.getOrCreate();
    if (!socket) return;

    socket.on('playback:tick', (data) => {
      usePlaybackStore.setState({ ...data });
    });

    return () => {
      socket.off('playback:tick');
    };
  }, []);
}
```

---

## 9. PWA 전역 구성

PWA는 제품 도메인 feature가 아니라 앱 전역 UI와 공통 브라우저 로직으로 구성한다.

```text
widgets/pwa/
  PwaProvider.tsx        → Service Worker 등록·브라우저 이벤트 구독
  PwaInstallPrompt.tsx   → 지원 브라우저 설치 안내
  PwaUpdateNotice.tsx    → 새 버전 적용 안내

shared/lib/pwa/
  serviceWorker.ts       → 등록·업데이트 감지 순수 로직
```

- `app/layout.tsx`에서 `PwaProvider`를 한 번 마운트한다.
- `app/manifest.ts`는 Manifest와 설치 아이콘을 제공하고, `app/offline/page.tsx`는 네트워크 연결 필요 안내를 제공한다.
- Service Worker는 정적 에셋·기본 앱 껍데기·오프라인 화면만 캐시한다. API·Socket·YouTube·사용자별 Room 데이터는 네트워크로만 처리한다.
- `PwaUpdateNotice`는 업데이트 가능 상태만 알린다. active Room을 자동 새로고침하지 않으며 사용자가 적용을 선택한다.

---

## 10. TanStack Query 설정

```ts
// shared/lib/query/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1분
      gcTime: 1000 * 60 * 5, // 5분
      retry: 1, // 실패 시 1회 재시도
      refetchOnWindowFocus: false, // Room 내 포커스 이동 시 불필요한 refetch 방지
    },
  },
});
```

---

## 11. 에러 처리 전략

### 전역 처리 (공통 레이어에서 처리)

| 에러                    | 처리 방식                                             |
| ----------------------- | ----------------------------------------------------- |
| `AUTH_UNAUTHORIZED`     | apiClient에서 자동 refresh 후 재시도 (토큰 없음/무효) |
| `AUTH_TOKEN_EXPIRED`    | apiClient에서 자동 refresh 후 재시도 (토큰 만료)      |
| `AUTH_REFRESH_EXPIRED`  | 자동 로그아웃 → Landing 리다이렉트                    |
| `SERVER_INTERNAL_ERROR` | Toast로 안내                                          |
| Socket 연결 해제        | Toast로 안내, 재연결 시도                             |

### 로컬 처리 (각 feature에서 처리)

| 에러                                                                | 처리 방식                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| `ROOM_NOT_FOUND`, `ROOM_CLOSED`, `ROOM_INACTIVE`, `ROOM_NOT_ACTIVE` | 페이지 단위 에러 UI                                   |
| `ROOM_ACCESS_DENIED`, `ROOM_MEMBER_KICKED`                          | Toast + Home 리다이렉트                               |
| `ROOM_RECOVERY_EXPIRED`                                             | 더 이상 사용할 수 없는 Room 안내 후 내 Room 목록 갱신 |
| `PLAYLIST_INVALID_URL`, `PLAYLIST_VIDEO_UNAVAILABLE`                | Toast                                                 |
| `SERVER_YOUTUBE_API_ERROR`, `SERVER_YOUTUBE_QUOTA_EXCEEDED`         | Toast                                                 |
| `room:kicked`                                                       | 추방 안내 + Socket 해제 + Home 이동                   |
| `room:closed`                                                       | 종료 안내 + Socket 해제 + Home 이동                   |
| `playback:reset`                                                    | Player·반복·셔플 UI 기본값으로 초기화                 |
| `playback:error`                                                    | Room 내 재생 불가 안내                                |
| 채팅 전송 성공                                                      | ack의 최종 `ChatMessage`로 임시 메시지 교체           |
| 채팅 전송 실패                                                      | Toast + optimistic update 롤백                        |
| 검색 실패                                                           | 검색 영역 에러 UI                                     |

---

## 12. 환경변수

```
# apps/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 12.1 운영(Vercel) 환경변수 설정

Vercel의 Production과 Preview 환경에는 아래 값을 모두 설정한다. Preview도 별도 스테이징 BE 없이 운영 BE를 사용하므로, 테스트에서 생성한 Room·채팅 데이터가 운영 DB에 반영될 수 있다.

| 변수                      | Production                       | Preview                          |
| ------------------------- | -------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_URL`     | `https://api.syfity.site/api/v1` | `https://api.syfity.site/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL`  | `https://api.syfity.site`        | `https://api.syfity.site`        |
| `NEXT_PUBLIC_API_MOCKING` | `disabled`                       | `disabled`                       |

Vercel 프로젝트의 Root Directory는 `apps/frontend`로 지정하고, Build Step에서 root directory 밖의 파일을 포함하는 옵션을 활성화한다. `prebuild` 훅은 `@syfity/shared`의 런타임 산출물을 먼저 생성한다.
