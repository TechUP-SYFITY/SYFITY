# 08. Backend Architecture

## 1. 문서 정보

| 항목      | 내용                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| 문서명    | Syfity Backend Architecture                                                           |
| 버전      | v1.8                                                                                  |
| 상태      | Presence 서비스 추가                                                                  |
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
| 캐시          | node-cache            | ICache 인터페이스로 추상화, Redis 교체 가능 (현재 미구현) |
| 로깅          | pino                  | 구조화 로깅. 개발 환경은 pino-pretty로 포맷               |
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

    generated/          → tsoa generate 출력 (gitignore 대상)
      routes.gen.ts     → 자동 생성된 Express 라우터
      swagger.json      → 자동 생성된 OpenAPI 스펙

    controllers/        → tsoa 데코레이터 + Service 주입
      auth.controller.ts
      chat.controller.ts
      health.controller.ts
      playlist.controller.ts
      room.controller.ts
      search.controller.ts
      user.controller.ts

    services/           → 비즈니스 로직, Repository 호출
      auth.service.ts
      chat.service.ts
      health.service.ts
      playback.service.ts  → Socket 핸들러에서 호출
      playlist.service.ts
      presence.service.ts  → Socket 핸들러에서 호출, 연결 해제 유예 타이머 관리
      room.service.ts
      search.service.ts    → YouTube API 직접 호출 (Repository 없음)
      user.service.ts

    repositories/       → Prisma 직접 호출, DB 접근 전담
      auth.repository.ts
      chat.repository.ts
      playback.repository.ts
      playlist.repository.ts
      room.repository.ts
      user.repository.ts

    socket/             → Socket.IO 이벤트 처리
      index.ts          → initSocket 함수 정의, 핸들러 등록
      socketAuth.ts     → Socket.IO 인증 (JWT 검증 + DB 사용자 존재 재확인)
      socketError.ts    → ack 에러 페이로드 변환 유틸
      socketValidators.ts → 이벤트 payload 검증 유틸
      handlers/
        chat.handler.ts
        playback.handler.ts
        presence.handler.ts
        room.handler.ts
        tick.handler.ts  → 10초 주기 playback:tick broadcast

    authentication.ts   → tsoa Security 핸들러 (REST 인증)
    ioc.ts              → tsoa iocModule (팩토리 레지스트리)

    errors/
      appError.ts       → 공통 애플리케이션 에러 클래스

    middlewares/        → Express 미들웨어
      error.middleware.ts → 전역 에러 응답 미들웨어

    lib/                → 공통 유틸
      prisma.ts         → PrismaClient 싱글턴
      io.ts             → Socket.IO 서버 인스턴스 getter/setter (setIo/getIo)
      logger.ts         → pino 로거 싱글턴 (production: JSON, development: pino-pretty, test: silent)
      cache/
        cache.interface.ts → ICache 인터페이스 정의
        cacheKeys.ts        → 캐시 키/TTL 상수
        node-cache.store.ts → node-cache 구현체 (MVP, 현재 유일한 구현체)
        index.ts
      youtube/
        youtube.client.ts

    types/              → 도메인별 백엔드 타입 (auth/cache/chat/health/playback/playlist/room/search/socket/user)
      express.d.ts      → Request 객체 확장 (user 정보 등)
      socket-data.d.ts  → Socket.data 확장 (userId, email)

    utils/              → 순수 유틸 함수
      authPayload.ts    → JWT payload 타입 가드
      chatPayload.ts    → 채팅 broadcast payload 변환
      cors.ts           → CORS origin 화이트리스트 검증
      roomAccess.ts     → assertActiveRoomMember/assertRoomHost 권한 체크
      tokenHash.ts      → Refresh Token 해시(SHA-256) 유틸
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
| Controller | 요청/응답 처리                   | Service만 호출, Prisma 직접 접근 금지 |
| Service    | 비즈니스 로직                    | Repository만 호출, 에러는 throw       |
| Repository | DB 접근 전담                     | Prisma Client 직접 호출               |

### 의존성 주입 패턴

각 레이어는 클래스로 구현하고, tsoa `iocModule`에서 의존 그래프를 조립한다. 외부 DI 컨테이너 없이 생성자 주입(수동 DI)을 사용한다.

**Repository — Prisma 주입, 인터페이스 선언**

```ts
// src/repositories/auth.repository.ts
import type { PrismaClient, User } from '../generated/prisma';

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<User | null>;
  upsertUser(data: { email: string; nickname: string; profileImage?: string }): Promise<User>;
}

export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  upsertUser(data: { email: string; nickname: string; profileImage?: string }) {
    return this.prisma.user.upsert({
      where: { email: data.email },
      update: { nickname: data.nickname, profileImage: data.profileImage },
      create: data,
    });
  }
}
```

**Service — Repository 인터페이스에 의존**

```ts
// src/services/auth.service.ts
import type { IAuthRepository } from '../repositories/auth.repository';

export class AuthService {
  constructor(private readonly authRepo: IAuthRepository) {}

  async loginWithGoogle(googleIdToken: string) {
    // 비즈니스 로직
    const user = await this.authRepo.findUserByEmail(email);
    // ...
  }
}
```

**Controller — tsoa 데코레이터 + Service 주입**

tsoa 데코레이터로 경로와 HTTP 메서드를 선언한다. 메서드는 데이터만 반환하고, 응답 직렬화와 에러 처리는 tsoa가 담당한다. `next(err)` 호출 대신 에러를 throw한다.

```ts
// src/controllers/auth.controller.ts
import type { Request as ExRequest } from 'express';
import { Get, Query, Request, Route } from 'tsoa';

import type { AuthService } from '../services/auth.service';
import type { LoginResponse } from '@syfity/shared';

@Route('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google/callback')
  async googleCallback(@Query() code: string, @Request() req: ExRequest): Promise<LoginResponse> {
    return this.authService.loginWithGoogle(code, req);
  }
}
```

**iocModule — 의존 그래프 조립**

tsoa는 컨트롤러를 자동으로 인스턴스화하므로, `iocModule`을 통해 생성자 주입을 연결한다. 별도 DI 라이브러리 없이 팩토리 레지스트리로 구현한다. 각 도메인 구현 시 이 파일에 팩토리를 등록한다.

```ts
// src/ioc.ts
import type { IocContainer } from 'tsoa';
import { cache } from './lib/cache';
import { prisma } from './lib/prisma';

// 각 도메인 구현 시 추가
// import { AuthController } from './controllers/auth.controller';
// import { AuthRepository } from './repositories/auth.repository';
// import { AuthService } from './services/auth.service';

const registry = new Map<Function, () => unknown>();

function register<T>(cls: new (...args: never[]) => T, factory: () => T): void {
  registry.set(cls, factory as () => unknown);
}

// 팩토리 등록 — T03~에서 도메인별로 추가
// register(AuthController, () => {
//   const repo = new AuthRepository(prisma);
//   return new AuthController(new AuthService(repo));
// });

export const iocContainer: IocContainer = {
  get<T>(controller: new (...args: never[]) => T): T {
    const factory = registry.get(controller);
    if (!factory) throw new Error(`IoC: ${controller.name} not registered`);
    return factory() as T;
  },
};
```

Cache가 필요한 Service는 생성자에서 `ICache`를 받는다.

```ts
export class RoomService {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly cache: ICache,
  ) {}
}
// register 예시
// register(RoomController, () => {
//   const repo = new RoomRepository(prisma);
//   return new RoomController(new RoomService(repo, cache));
// });
```

**인증 핸들러 — tsoa Security 연동**

`@Security('jwt')` 데코레이터가 선언된 엔드포인트는 tsoa가 `expressAuthentication`을 자동으로 호출한다. REST 인증은 일반 Express 인증 미들웨어를 직접 붙이지 않고 tsoa Security 진입점을 사용한다. Socket.IO 인증은 별도로 `socket/socketAuth.ts`의 `socketAuth`를 사용한다.

JWT 서명/만료만 검증하는 것으로는 부족하다 — 토큰이 유효해도 그 사이 계정이 삭제됐을 수 있으므로, `UserRepository.findUserById`로 DB 존재 여부까지 재확인한다.

```ts
// src/authentication.ts
import type { Request } from 'express';
import jwt from 'jsonwebtoken';

import { ERROR_CODES } from '@syfity/shared';

import { prisma } from './lib/prisma';
import { UserRepository } from './repositories/user.repository';
import { config } from './config';
import { AppError } from './errors/appError';
import { isAuthPayload } from './utils/authPayload';

const userRepository = new UserRepository(prisma);

export function expressAuthentication(
  request: Request,
  securityName: string,
): Promise<{ id: string; email: string }> {
  if (securityName !== 'jwt') {
    return Promise.reject(
      new AppError(401, ERROR_CODES.AUTH_UNAUTHORIZED, '알 수 없는 보안 스킴입니다.'),
    );
  }

  const token = request.cookies?.access_token as string | undefined;
  if (!token) {
    return Promise.reject(new AppError(401, ERROR_CODES.AUTH_UNAUTHORIZED, '인증이 필요합니다.'));
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwt.accessSecret, async (err, payload) => {
      if (err instanceof jwt.TokenExpiredError) {
        reject(new AppError(401, ERROR_CODES.AUTH_TOKEN_EXPIRED, '토큰이 만료되었습니다.'));
        return;
      }
      if (err || !isAuthPayload(payload)) {
        reject(new AppError(401, ERROR_CODES.AUTH_UNAUTHORIZED, '유효하지 않은 토큰입니다.'));
        return;
      }

      const storedUser = await userRepository.findUserById(payload.id);
      if (!storedUser) {
        reject(new AppError(404, ERROR_CODES.AUTH_USER_NOT_FOUND, '사용자를 찾을 수 없습니다.'));
        return;
      }

      const user = { id: payload.id, email: payload.email };
      request.user = user;
      resolve(user);
    });
  });
}
```

**app.ts — 생성된 라우터 등록**

```ts
import { ValidateError } from 'tsoa';
import swaggerUi from 'swagger-ui-express';
import { RegisterRoutes } from './generated/routes.gen';

// tsoa generate 실행 후 생성됨
// eslint-disable-next-line @typescript-eslint/no-require-imports
const swaggerDocument = require('./generated/swagger.json');

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// tsoa 생성 라우터
RegisterRoutes(app);

// tsoa 요청 유효성 검사 실패 처리 (errorHandler 이전에 등록)
app.use(
  (err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ValidateError) {
      res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
      return;
    }
    next(err);
  },
);

app.use(errorHandler);
```

**예외: search**

`search`는 DB 접근 없이 YouTube API만 호출한다. `search.service.ts`가 `lib/youtube/youtube.client.ts`를 직접 호출하며, Repository 레이어가 없다.

**playback**

재생 제어는 Socket 이벤트로만 처리하므로 REST 레이어(Router/Controller)가 없다. 단, PlaybackState의 DB 저장/조회가 필요하므로 `playback.service.ts`와 `playback.repository.ts`는 존재한다. Socket 핸들러에서 Service를 호출하는 구조다.

### 에러 처리 흐름

```
Repository → throw AppError
Service    → throw AppError (catch 없음)
Controller → throw AppError (catch 없음, tsoa가 자동으로 에러 핸들러로 전달)
ValidateError 핸들러 → 422 응답 (tsoa 요청 유효성 검사 실패)
전역 에러 미들웨어 → AppError 코드 기반 응답 반환
```

tsoa가 컨트롤러 메서드를 래핑하므로 Controller에서 try-catch가 불필요하다. 에러는 모두 throw하고 전역 핸들러에서 처리한다. Socket 핸들러는 tsoa 범위 밖이므로 기존처럼 try-catch를 직접 처리한다.

---

## 5. 환경변수

환경변수는 `config.ts`에서 중앙 관리한다. 분산된 `process.env` 직접 참조를 금지하고, 앱 시작 시점에 필수값 누락을 확인할 수 있다.

```ts
// src/config.ts
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`필수 환경변수 ${name}가 설정되지 않았습니다.`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? '4000',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: '1h',
    accessExpiresInMs: 60 * 60 * 1000,
    refreshExpiresIn: '30d',
    refreshExpiresInMs: 30 * 24 * 60 * 60 * 1000,
  },
  google: {
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    callbackUrl: requireEnv('GOOGLE_CALLBACK_URL'),
  },
  youtube: {
    apiKey: requireEnv('YOUTUBE_API_KEY'),
  },
  db: {
    url: requireEnv('DATABASE_URL'),
  },
};
```

`requireEnv`는 값이 없으면 모듈 로드 시점(서버 부팅 시)에 바로 에러를 던진다. env 하나가 비어도 서버가 뜨자마자 죽으므로, "런타임 중 예측 불가능한 위치에서 실패"하는 대신 배포 직후 바로 원인을 알 수 있다. 테스트 환경은 `vitest.setup.ts`가 이 값들의 기본값을 미리 채워 넣는다.

---

## 6. Socket.IO 구조

### 초기화

```ts
// src/server.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setIo } from './lib/io';
import { prisma } from './lib/prisma';
import { startPlaybackTick, stopPlaybackTick } from './socket/handlers/tick.handler';
import app from './app';
import { initSocket } from './socket';

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { ... } });

setIo(io);
initSocket(io);
const playbackTickTimer = startPlaybackTick(io);

httpServer.listen(config.port, () => { /* ... */ });

let isShuttingDown = false;
function shutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  stopPlaybackTick(playbackTickTimer);
  io.close();
  httpServer.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

`lib/io.ts`의 `setIo`/`getIo`는 Socket.IO 서버 인스턴스를 모듈 스코프에 저장해두고, REST에서 트리거되는 Service(`RoomService.closeRoomAndBroadcast` 등)가 호출 시점에 `getIo()`로 지연 조회할 수 있게 한다. `graceful shutdown`은 `SIGINT`/`SIGTERM` 수신 시 tick 타이머 정리 → Socket.IO 연결 종료 → HTTP 서버 종료 → Prisma 연결 해제 순으로 정리한다. Render가 재배포 시 보내는 `SIGTERM`을 처리하지 않으면 처리 중인 요청과 소켓 연결이 강제로 끊긴다.

### 핸들러 등록

```ts
// src/socket/index.ts
import type { Server } from 'socket.io';
import { registerChatHandlers } from './handlers/chat.handler';
import { registerPlaybackHandlers } from './handlers/playback.handler';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { registerRoomHandlers } from './handlers/room.handler';
import { socketAuth } from './socketAuth';

export function initSocket(io: Server): void {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    registerRoomHandlers(io, socket);
    registerPlaybackHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      /* 로그만 남김 */
    });
  });
}
```

`tick.handler.ts`의 `startPlaybackTick(io)`는 `initSocket`이 아니라 `server.ts`에서 별도로 호출한다 — 개별 소켓 연결과 무관하게 10초 주기로 재생 중인 모든 Room에 `playback:tick`을 broadcast하는 전역 타이머이기 때문이다.

### Socket 에러 처리

Socket 핸들러는 HTTP 미들웨어가 적용되지 않으므로 각 핸들러에서 직접 try-catch로 처리한다. ack가 있는 이벤트는 에러를 ack로 반환하고, ack가 없는 이벤트는 서버 로그만 남긴다.

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

각 핸들러 파일은 도메인별 Socket 이벤트를 등록한다. 테스트가 필요한 핸들러는 기존 `registerXHandlers(io, socket)` 호출 형태를 유지하면서, 세 번째 선택적 `deps` 파라미터로 Service 의존성을 주입할 수 있다.

```ts
// src/socket/handlers/room.handler.ts
import type { Server, Socket } from 'socket.io';

import {
  playbackService as defaultPlaybackService,
  presenceService as defaultPresenceService,
  roomService as defaultRoomService,
} from '../../ioc';
import type { PlaybackService } from '../../services/playback.service';
import type { PresenceService } from '../../services/presence.service';
import type { RoomService } from '../../services/room.service';

type RoomHandlerService = Pick<
  RoomService,
  'setMemberOnline' | 'leaveRoom' | 'createSystemMessage'
>;
type RoomHandlerPlaybackService = Pick<PlaybackService, 'getPlaybackStateForSocket'>;
type RoomHandlerPresenceService = Pick<
  PresenceService,
  'cancelMemberOfflineTimer' | 'cancelHostCloseTimer'
>;

type RoomHandlerDeps = {
  roomService: RoomHandlerService;
  playbackService: RoomHandlerPlaybackService;
  presenceService: RoomHandlerPresenceService;
};

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  deps: RoomHandlerDeps = {
    roomService: defaultRoomService,
    playbackService: defaultPlaybackService,
    presenceService: defaultPresenceService,
  },
): void {
  const { roomService, playbackService, presenceService } = deps;

  socket.on('room:join', async (payload, ack) => {
    // roomService로 참여 상태 갱신(원자적 조건부 UPDATE로 wasOnline 판단),
    // presenceService로 대기 중인 유예 타이머 취소 및 현재 Host 연결 상태 조회,
    // playbackService로 재생 상태 조회 후 ack 응답.
    // wasOnline이 false일 때만 입장 시스템 메시지 broadcast.
  });

  socket.on('room:leave', async (payload) => {
    // roomService.leaveRoom 결과가 'closed' | 'left' | 'noop' 중 하나.
    // 'noop'(이미 나간 상태로 중복 emit)이면 broadcast/시스템 메시지 없이 종료.
  });
}
```

---

## 7. 미들웨어

### 인증

REST 엔드포인트와 Socket.IO는 인증 방식이 다르다.

| 경로                      | 방식                    | 파일                       |
| ------------------------- | ----------------------- | -------------------------- |
| REST (`@Security('jwt')`) | `expressAuthentication` | `src/authentication.ts`    |
| Socket.IO                 | `socketAuth` 미들웨어   | `src/socket/socketAuth.ts` |

REST의 `expressAuthentication`과 마찬가지로, JWT 검증만으로는 부족해 `UserRepository.findUserById`로 DB 존재 여부까지 재확인한다 — 그렇지 않으면 계정 삭제 직후에도 만료 전 토큰으로 Socket 연결을 계속 쓸 수 있다.

```ts
// src/socket/socketAuth.ts
const userRepository = new UserRepository(prisma);

export async function socketAuth(socket: Socket, next: (err?: Error) => void): Promise<void> {
  const rawCookie = socket.handshake.headers.cookie ?? '';
  const token = parseCookie(rawCookie).access_token;

  if (!token) {
    next(toSocketError('AUTH_UNAUTHORIZED', '인증이 필요합니다.'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    if (!isAuthPayload(payload)) {
      next(toSocketError('AUTH_UNAUTHORIZED', '유효하지 않은 토큰입니다.'));
      return;
    }

    const user = await userRepository.findUserById(payload.id);
    if (!user) {
      next(toSocketError('AUTH_USER_NOT_FOUND', '사용자를 찾을 수 없습니다.'));
      return;
    }

    socket.data.userId = payload.id;
    socket.data.email = payload.email;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(toSocketError('AUTH_TOKEN_EXPIRED', '토큰이 만료되었습니다.'));
      return;
    }

    next(toSocketError('AUTH_UNAUTHORIZED', '유효하지 않은 토큰입니다.'));
  }
}
```

### 전역 에러 미들웨어

```ts
// src/errors/appError.ts
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

```ts
// src/middlewares/error.middleware.ts
import { AppError } from '../errors/appError';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }
  res.status(500).json({
    success: false,
    error: { code: 'SERVER_INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' },
  });
}
```

## 8. tsoa 설정

### tsoa.json

```json
{
  "entryFile": "src/server.ts",
  "noImplicitAdditionalProperties": "throw-on-extras",
  "controllerPathGlobs": ["src/controllers/**/*.controller.ts"],
  "spec": {
    "outputDirectory": "src/generated",
    "specVersion": 3,
    "name": "Syfity API",
    "version": "1.0.0",
    "securityDefinitions": {
      "jwt": {
        "type": "apiKey",
        "name": "access_token",
        "in": "cookie"
      }
    },
    "basePath": "/api/v1"
  },
  "routes": {
    "routesDir": "src/generated",
    "routesFileName": "routes.gen.ts",
    "iocModule": "src/ioc",
    "authenticationModule": "src/authentication",
    "basePath": "/api/v1"
  }
}
```

### 빌드 플로우

```
pnpm --filter @syfity/shared build  →  @syfity/shared 런타임 산출물 생성
tsoa spec-and-routes                →  src/generated/routes.gen.ts + src/generated/swagger.json 생성
tsc -p tsconfig.build.json          →  TypeScript 컴파일
cp swagger.json                     →  dist/src/generated/swagger.json 복사
```

`src/generated/`는 `.gitignore` 대상이며, 개발/빌드 스크립트에서 자동으로 생성한다. `routes.gen.ts`는
TypeScript 컴파일 대상이지만 `swagger.json`은 자동 복사되지 않으므로, 빌드 후 `dist/src/generated/`로 복사한다.
`@syfity/shared`의 런타임 진입점은 `dist/index.js`이므로 백엔드 빌드/시작/테스트 전 shared 빌드를 먼저 실행한다.

```json
// package.json scripts
{
  "generate": "tsoa spec-and-routes",
  "dev": "tsoa spec-and-routes && tsx watch src/server.ts",
  "prebuild": "pnpm --filter @syfity/shared build",
  "build": "tsoa spec-and-routes && tsc -p tsconfig.build.json",
  "postbuild": "mkdir -p dist/src/generated && cp src/generated/swagger.json dist/src/generated/swagger.json",
  "prestart": "pnpm --filter @syfity/shared build",
  "start": "node dist/src/server.js",
  "pretest": "pnpm --filter @syfity/shared build"
}
```

### 새 도메인 추가 체크리스트

1. `src/controllers/<domain>.controller.ts` — tsoa 데코레이터 + 생성자 주입
2. `src/ioc.ts` — 팩토리 등록
3. `tsoa spec-and-routes` 실행 — 라우터 + 스펙 재생성
4. `packages/shared/src/dto/<domain>.dto.ts` — 요청/응답 타입

---

## 9. Request 타입 확장

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

## 10. 환경변수 목록

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

### 10.1 운영(Render) 환경변수 설정

Render Blueprint는 민감값을 `sync: false`로 선언하고, 실제 값은 Render 대시보드에서 직접 입력한다.

| 키                                          | 운영 값 기준                                                                                                                                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                  | `production`                                                                                                                                                                                                         |
| `NODE_VERSION`                              | `22`                                                                                                                                                                                                                 |
| `CLIENT_URL`                                | T21에서 확정되는 FE 프로덕션 URL. T20 시점에는 임시값을 입력하고 T21 완료 후 `https://{domain}`으로 갱신                                                                                                             |
| `ALLOWED_ORIGINS`                           | 프로덕션 origin을 쉼표로 구분해 명시. `cors.ts`는 `*.vercel.app` 같은 와일드카드를 허용하지 않고 이 목록과 정확히 일치하는 origin만 허용한다 — Vercel Preview를 쓰려면 실제 preview origin을 이 목록에 추가해야 한다 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`  | 운영 전용 랜덤 문자열. 로컬 `.env` 값 재사용 금지                                                                                                                                                                    |
| `DATABASE_URL`                              | Supabase Session Pooler 연결 문자열                                                                                                                                                                                  |
| `YOUTUBE_API_KEY`                           | 운영용 또는 기존 YouTube Data API v3 키                                                                                                                                                                              |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | GCP OAuth 클라이언트 값                                                                                                                                                                                              |
| `GOOGLE_CALLBACK_URL`                       | `https://api.{domain}/api/v1/auth/google/callback`                                                                                                                                                                   |

`PORT`는 Render web service가 자동 주입하므로 고정하지 않는다. Supabase Direct Connection은 IPv6 전용일 수 있어 Render에서는 Session Pooler 사용을 기본값으로 둔다.
