# 07. Frontend Architecture

## 1. 문서 정보

| 항목      | 내용                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| 문서명    | Syfity Frontend Architecture                                                          |
| 버전      | v1.0                                                                                  |
| 상태      | 초안                                                                                  |
| 작성 목적 | Syfity MVP 프론트엔드 구조 정의                                                       |
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
| E2E 테스트          | Playwright               | WebSocket 네이티브 지원                  |
| 컴포넌트 문서화     | Storybook                | 디자인 시스템 컴포넌트 확인용            |
| 패키지 매니저       | pnpm                     | 모노레포 workspace                       |

---

## 3. 폴더 구조

FSD(Feature Sliced Design)를 Syfity에 맞게 간소화하여 적용한다. 원본 FSD의 `entities`와 `features`를 `features`로 통합하고, `widgets` 레이어는 생략한다. 단, 여러 feature를 조합하는 복합 UI가 필요한 경우 (예: Room Page) `widgets` 레이어를 추가하는 것을 고려할 수 있다.

```
apps/frontend/
  src/
    app/                      → Next.js App Router 페이지 및 레이아웃
      (auth)/
        callback/
          page.tsx            → Google OAuth 콜백 처리
      (protected)/
        home/
          page.tsx            → Home Page
        room/
          join/
            page.tsx          → 초대 링크 진입점 (/room/join?code=ABC123)
          [roomId]/
            page.tsx          → Room Page
            layout.tsx        → Room 레이아웃 (Socket 연결/해제)
      page.tsx                → Landing Page (로그인)
      layout.tsx              → Root 레이아웃
      proxy.ts                → Route 보호 (쿠키 존재 여부 체크)

    features/                 → 기능 단위 모듈 (FSD features + entities 통합)
      auth/
      room/
      player/
      playlist/
      chat/
      presence/
      search/

    shared/                   → 공통 모듈
      components/             → 공통 UI 컴포넌트 (디자인 시스템 문서 참조)
      hooks/                  → 공통 훅
      lib/
        api/                  → apiClient.ts (fetch wrapper)
        socket/               → socketClient.ts (Socket.IO singleton)
        query/                → queryClient.ts (TanStack Query 설정)
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
```

### feature별 slice 구성

| feature  | api | hooks | store | components | types |
| -------- | --- | ----- | ----- | ---------- | ----- |
| auth     | O   | O     | X     | X          | O     |
| room     | O   | O     | O     | O          | O     |
| player   | X   | O     | O     | O          | O     |
| playlist | O   | O     | O     | O          | O     |
| chat     | O   | O     | O     | O          | O     |
| presence | X   | O     | O     | O          | O     |
| search   | O   | O     | X     | O          | O     |

- `auth` store X → 사용자 정보는 TanStack Query (`useMe`)로 관리
- `player` api X → 재생 제어는 Socket 이벤트로 처리
- `presence` api X → 참여자 상태는 Socket 이벤트로만 관리
- `search` store X → 검색 결과는 TanStack Query로 캐싱

### 레이어 규칙

레이어 간 단방향 의존을 원칙으로 한다.

```
app → features → shared
```

- `shared`에서 `features` import 금지
- `features` 간 직접 import 금지 (공통 로직은 `shared`로 이동)

**app (page / layout)**

- 컴포넌트 조합만 담당
- 비즈니스 로직, 데이터 페칭 없음
- Server Component 기본

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

| 경로             | 페이지         | 인증 필요 | 설명                                           |
| ---------------- | -------------- | --------- | ---------------------------------------------- |
| `/`              | Landing        | X         | 서비스 소개, Google 로그인 버튼                |
| `/auth/callback` | OAuth Callback | X         | Google OAuth 콜백 처리, JWT 발급 후 리다이렉트 |
| `/home`          | Home           | O         | Room 생성, 초대 코드 입력, 최근 Room 목록      |
| `/room/join`     | Room Join      | O         | 초대 링크 진입점 (`?code=ABC123`)              |
| `/room/[roomId]` | Room           | O         | 음악 감상, Playlist, Chat, Presence            |

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

| 상태 유형      | 관리 방식      | 대상 데이터                                    |
| -------------- | -------------- | ---------------------------------------------- |
| Server State   | TanStack Query | 최근 Room 목록, 사용자 정보, YouTube 검색 결과 |
| Realtime State | Zustand        | PlaybackState, Playlist, Chat, Presence        |
| Client State   | Zustand 우선   | 여러 컴포넌트가 공유하는 UI 상태 (모달, 탭 등) |
| Local State    | React useState | 단일 컴포넌트 내부 상태 (input 값, hover 등)   |

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

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    const error = await response.json();

    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_TOKEN_EXPIRED') {
      // Access Token 없음/만료 → refresh 시도
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!refreshRes.ok) {
        // refresh 실패 → 바로 에러 throw (무한 루프 방지)
        throw error;
      }

      // refresh 성공 → 원래 요청 재시도
      return request<T>(url, options);
    }

    if (error.code === 'AUTH_REFRESH_EXPIRED') {
      // Refresh Token 만료 → 로그아웃 후 Landing으로 이동
      window.location.href = '/';
      throw new Error('AUTH_REFRESH_EXPIRED');
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
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
  joinRoom: (body: { inviteCode?: string; roomId?: string }) => apiClient.post('/rooms/join', body),
  getRecentRooms: () => apiClient.get('/rooms/recent'),
  closeRoom: (roomId: string) => apiClient.post(`/rooms/${roomId}/close`),
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
  connect: () => {
    if (!socket) {
      socket = io(SOCKET_URL, { withCredentials: true });
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

### Socket 연결/해제 시점

layout은 Server Component로 유지하고, Socket 연결/해제는 별도 Client Component(`RoomSocketProvider`)에서 담당한다. `RoomSocketProvider`는 Socket 연결/해제만 처리하며, `room:join` 이벤트 전송은 REST 완료 후 별도 훅에서 처리한다.

```ts
// features/room/components/RoomSocketProvider.tsx
'use client';

export function RoomSocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    socketClient.connect();
    return () => {
      socketClient.disconnect();
    };
  }, []);

  return <>{children}</>;
}
```

```ts
// src/app/(protected)/room/[roomId]/layout.tsx (Server Component)
export default function RoomLayout({ children }) {
  return (
    <RoomSocketProvider>
      {children}
    </RoomSocketProvider>
  );
}
```

### room:join 이벤트 전송

`room:join` Socket 이벤트는 `POST /rooms/join` REST 완료 후 별도 훅에서 전송한다. REST와 Socket의 순서를 보장하기 위해 훅 단위로 분리한다.

```ts
// features/room/hooks/useRoomSocket.ts
'use client';

export function useRoomSocket(roomId: string) {
  useEffect(() => {
    const socket = socketClient.get();
    if (!socket) return;

    socket.emit('room:join', { roomId });

    return () => {
      socket.emit('room:leave', { roomId });
    };
  }, [roomId]);
}
```

### Socket 이벤트 구독

Socket 이벤트 구독은 각 feature의 hook에서 `useEffect`로 처리한다. store 초기화 시점에 구독하면 Socket이 아직 `null`일 수 있으므로 반드시 hook에서 구독한다.

```ts
// features/player/hooks/usePlaybackSocket.ts
'use client';

export function usePlaybackSocket() {
  useEffect(() => {
    const socket = socketClient.get();
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

## 9. TanStack Query 설정

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

## 10. 에러 처리 전략

### 전역 처리 (공통 레이어에서 처리)

| 에러                    | 처리 방식                                             |
| ----------------------- | ----------------------------------------------------- |
| `AUTH_UNAUTHORIZED`     | apiClient에서 자동 refresh 후 재시도 (토큰 없음/무효) |
| `AUTH_TOKEN_EXPIRED`    | apiClient에서 자동 refresh 후 재시도 (토큰 만료)      |
| `AUTH_REFRESH_EXPIRED`  | 자동 로그아웃 → Landing 리다이렉트                    |
| `SERVER_INTERNAL_ERROR` | Toast로 안내                                          |
| Socket 연결 해제        | Toast로 안내, 재연결 시도                             |

### 로컬 처리 (각 feature에서 처리)

| 에러                                                        | 처리 방식                                  |
| ----------------------------------------------------------- | ------------------------------------------ |
| `ROOM_NOT_FOUND`, `ROOM_CLOSED`, `ROOM_INACTIVE`            | 페이지 단위 에러 UI                        |
| `ROOM_ACCESS_DENIED`                                        | Toast + Home 리다이렉트                    |
| `PLAYLIST_INVALID_URL`, `PLAYLIST_VIDEO_UNAVAILABLE`        | Toast                                      |
| `SERVER_YOUTUBE_API_ERROR`, `SERVER_YOUTUBE_QUOTA_EXCEEDED` | Toast                                      |
| `playback:error`                                            | Room 내 에러 UI + Host에게 다음 곡 이동 UI |
| 채팅 전송 실패                                              | Toast + optimistic update 롤백             |
| 검색 실패                                                   | 검색 영역 에러 UI                          |

---

## 11. 환경변수

```
# apps/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```
