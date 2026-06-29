# 08. Backend Architecture

## 1. 문서 정보

| 항목      | 내용                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| 문서명    | Syfity Backend Architecture                                                           |
| 버전      | v1.0                                                                                  |
| 상태      | 초안                                                                                  |
| 작성 목적 | Syfity MVP 백엔드 구조 정의                                                           |
| 기반 문서 | `01-prd.md`, `02-system-architecture.md`, `05-api-spec.md`, `06-socket-event-spec.md` |

---

## 2. 기술 스택

| 항목          | 기술                  | 비고                                                      |
| ------------- | --------------------- | --------------------------------------------------------- |
| 프레임워크    | Express.js            | REST API + Socket.IO 단일 서버                            |
| 언어          | TypeScript            |                                                           |
| 실시간 통신   | Socket.IO             |                                                           |
| ORM           | Prisma                | 마이그레이션 + 타입 자동 생성                             |
| DB            | Supabase (PostgreSQL) |                                                           |
| 캐시          | node-cache            | CacheStore 인터페이스로 추상화, Redis 교체 가능           |
| 인증          | JWT                   | httpOnly 쿠키, Refresh Token Rotation                     |
| Google OAuth  | google-auth-library   | OAuth2Client로 인증 URL 생성, 토큰 교환, 사용자 정보 조회 |
| 외부 API      | YouTube Data API v3   | 서버사이드 프록시                                         |
| 패키지 매니저 | pnpm                  | 모노레포 workspace                                        |

---

## 3. 폴더 구조

```
apps/backend/
  prisma/
    schema.prisma
    migrations/

  src/
    config.ts           → 환경변수 중앙 관리
    app.ts              → Express 앱 설정 (미들웨어, 라우터 등록)
    server.ts           → 서버 진입점 (HTTP 서버 생성, Socket.IO 초기화)

    routes/             → 엔드포인트 정의, Controller 연결
      authRouter.ts
      meRouter.ts
      roomRouter.ts
      playlistRouter.ts
      chatRouter.ts
      searchRouter.ts

    controllers/        → 요청/응답 처리, try-catch, Service 호출
      authController.ts
      meController.ts
      roomController.ts
      playlistController.ts
      chatController.ts
      searchController.ts

    services/           → 비즈니스 로직, Repository 호출
      authService.ts
      meService.ts
      roomService.ts
      playlistService.ts
      chatService.ts
      playbackService.ts  → Socket 핸들러에서 호출
      searchService.ts    → YouTube API 직접 호출 (Repository 없음)

    repositories/       → Prisma 직접 호출, DB 접근 전담
      authRepository.ts
      meRepository.ts
      roomRepository.ts
      playlistRepository.ts
      chatRepository.ts
      playbackRepository.ts

    socket/             → Socket.IO 이벤트 처리
      index.ts          → initSocket 함수 정의, 핸들러 등록
      handlers/
        room.handler.ts
        playback.handler.ts
        playlist.handler.ts
        chat.handler.ts
        presence.handler.ts

    middlewares/        → Express 미들웨어
      auth.middleware.ts
      error.middleware.ts

    lib/                → 공통 유틸
      cache/
        cache.interface.ts
        node-cache.store.ts
        redis.store.ts
        index.ts
      youtube/
        youtube.client.ts

    types/              → 공통 타입
      express.d.ts      → Request 객체 확장 (user 정보 등)
```

---

## 4. 레이어 구조

```
Router → Controller → Service → Repository
```

레이어 간 단방향 의존을 원칙으로 한다.

| 레이어     | 역할                             | 규칙                                  |
| ---------- | -------------------------------- | ------------------------------------- |
| Router     | 엔드포인트 정의, Controller 연결 | 비즈니스 로직 없음                    |
| Controller | 요청/응답 처리, try-catch        | Service만 호출, Prisma 직접 접근 금지 |
| Service    | 비즈니스 로직                    | Repository만 호출, 에러는 throw       |
| Repository | DB 접근 전담                     | Prisma Client 직접 호출               |

**예외: search**

`search`는 DB 접근 없이 YouTube API만 호출한다. `searchService.ts`가 `lib/youtube/youtube.client.ts`를 직접 호출하며, Repository 레이어가 없다.

**playback**

재생 제어는 Socket 이벤트로만 처리하므로 REST 레이어(Router/Controller)가 없다. 단, PlaybackState의 DB 저장/조회가 필요하므로 `playbackService.ts`와 `playbackRepository.ts`는 존재한다. Socket 핸들러에서 Service를 호출하는 구조다.

### 에러 처리 흐름

```
Repository → throw Error
Service    → throw Error (catch 없음)
Controller → try-catch → 전역 에러 미들웨어로 전달
전역 에러 미들웨어 → 에러 코드 기반 응답 반환
```

Service는 에러를 throw만 하고, Controller가 catch한다. 전역 에러 미들웨어에서 일관된 응답 형식으로 처리한다.

---

## 5. 환경변수

환경변수는 `config.ts`에서 중앙 관리한다. 분산된 `process.env` 직접 참조를 금지하고, 앱 시작 시점에 필수값 누락을 확인할 수 있다.

```ts
// src/config.ts
export const config = {
  port: process.env.PORT ?? '4000',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiresIn: '1h',
    refreshExpiresIn: '30d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL!,
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY!,
  },
  db: {
    url: process.env.DATABASE_URL!,
  },
};
```

---

## 6. Socket.IO 구조

### 초기화

```ts
// src/server.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { initSocket } from './socket';

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { ... } });

initSocket(io);
```

### 핸들러 등록

```ts
// src/socket/index.ts
import { Server } from 'socket.io';
import { registerRoomHandlers } from './handlers/room.handler';
import { registerPlaybackHandlers } from './handlers/playback.handler';
import { registerChatHandlers } from './handlers/chat.handler';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { registerPlaylistHandlers } from './handlers/playlist.handler';

export function initSocket(io: Server) {
  io.on('connection', (socket) => {
    registerRoomHandlers(io, socket);
    registerPlaybackHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerPlaylistHandlers(io, socket);
  });
}
```

### Socket 에러 처리

Socket 핸들러는 HTTP 미들웨어가 적용되지 않으므로 각 핸들러에서 직접 try-catch로 처리한다. ack가 있는 이벤트는 에러를 ack로 반환하고, ack가 없는 이벤트는 에러 이벤트를 emit한다.

```ts
socket.on('room:join', async ({ roomId }, ack) => {
  try {
    // 처리 로직
    ack({ success: true, data: { ... } });
  } catch (err) {
    ack({ success: false, error: { code: err.code, message: err.message } });
  }
});
```

### 핸들러 구조

각 핸들러 파일은 도메인별 Socket 이벤트를 등록한다.

```ts
// src/socket/handlers/room.handler.ts
import { Server, Socket } from 'socket.io';

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on('room:join', async ({ roomId }, ack) => {
    // 처리 로직
  });

  socket.on('room:leave', async ({ roomId }) => {
    // 처리 로직
  });

  socket.on('disconnect', async () => {
    // disconnect는 Room, Presence, Playback 타이머 등 여러 도메인에 영향을 줌
    // room.handler.ts에서 통합 처리하며, 필요한 Service를 각각 호출
  });
}
```

---

## 7. 미들웨어

### 인증 미들웨어

```ts
// src/middlewares/auth.middleware.ts
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ success: false, error: { code: 'AUTH_UNAUTHORIZED' } });

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    req.user = payload as { id: string; email: string };
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: 'AUTH_UNAUTHORIZED' } });
  }
}
```

### 전역 에러 미들웨어

```ts
// src/middlewares/error.middleware.ts
export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  const status = err.status ?? 500;
  const code = err.code ?? 'SERVER_INTERNAL_ERROR';
  const message = err.message ?? '서버 오류가 발생했습니다.';

  res.status(status).json({
    success: false,
    error: { code, message },
  });
}
```

---

## 8. Request 타입 확장

Express `Request` 객체에 인증된 사용자 정보를 붙이기 위해 타입을 확장한다.

```ts
// src/types/express.d.ts
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}
```

---

## 9. 환경변수 목록

```
# apps/backend/.env

PORT=4000
CLIENT_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

# Supabase
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# YouTube
YOUTUBE_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback
```
