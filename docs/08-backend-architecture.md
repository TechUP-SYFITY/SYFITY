# 08. Backend Architecture

## 1. 문서 정보

| 항목      | 내용                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| 문서명    | Syfity Backend Architecture                                                           |
| 버전      | v1.2                                                                                  |
| 상태      | tsoa 컨트롤러 패턴 + iocModule + Swagger 반영                                         |
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

    generated/          → tsoa generate 출력 (gitignore 대상)
      routes.gen.ts     → 자동 생성된 Express 라우터
      swagger.json      → 자동 생성된 OpenAPI 스펙

    controllers/        → tsoa 데코레이터 + Service 주입
      auth.controller.ts
      me.controller.ts
      room.controller.ts
      playlist.controller.ts
      chat.controller.ts
      search.controller.ts

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

    authentication.ts   → tsoa Security 핸들러 (REST 인증)
    ioc.ts              → tsoa iocModule (팩토리 레지스트리)

    errors/
      appError.ts       → 공통 애플리케이션 에러 클래스

    middlewares/        → Express 미들웨어
      auth.middleware.ts  → Socket.IO 인증 전용
      error.middleware.ts → 전역 에러 응답 미들웨어

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

`@Security('jwt')` 데코레이터가 선언된 엔드포인트는 tsoa가 `expressAuthentication`을 자동으로 호출한다. 기존 `authenticate` 미들웨어를 대체하며, Socket.IO 인증은 별도로 `auth.middleware.ts`의 `authenticate`를 유지한다.

```ts
// src/authentication.ts
import type { Request } from 'express';
import jwt from 'jsonwebtoken';

import { config } from './config';
import { AppError } from './errors/appError';

export function expressAuthentication(
  request: Request,
  securityName: string,
): Promise<{ id: string; email: string }> {
  if (securityName === 'jwt') {
    const token = request.cookies?.access_token as string | undefined;
    if (!token) {
      return Promise.reject(new AppError(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.'));
    }
    return new Promise((resolve, reject) => {
      jwt.verify(token, config.jwt.accessSecret, (err, payload) => {
        if (err instanceof jwt.TokenExpiredError) {
          reject(new AppError(401, 'AUTH_TOKEN_EXPIRED', '토큰이 만료되었습니다.'));
        } else if (err) {
          reject(new AppError(401, 'AUTH_UNAUTHORIZED', '유효하지 않은 토큰입니다.'));
        } else {
          const user = payload as { id: string; email: string };
          request.user = user;
          resolve(user);
        }
      });
    });
  }
  return Promise.reject(new AppError(401, 'AUTH_UNAUTHORIZED', '알 수 없는 보안 스킴입니다.'));
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

`search`는 DB 접근 없이 YouTube API만 호출한다. `searchService.ts`가 `lib/youtube/youtube.client.ts`를 직접 호출하며, Repository 레이어가 없다.

**playback**

재생 제어는 Socket 이벤트로만 처리하므로 REST 레이어(Router/Controller)가 없다. 단, PlaybackState의 DB 저장/조회가 필요하므로 `playbackService.ts`와 `playbackRepository.ts`는 존재한다. Socket 핸들러에서 Service를 호출하는 구조다.

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

### 인증

REST 엔드포인트와 Socket.IO는 인증 방식이 다르다.

| 경로                      | 방식                    | 파일                                 |
| ------------------------- | ----------------------- | ------------------------------------ |
| REST (`@Security('jwt')`) | `expressAuthentication` | `src/authentication.ts`              |
| Socket.IO                 | `authenticate` 미들웨어 | `src/middlewares/auth.middleware.ts` |

```ts
// src/middlewares/auth.middleware.ts — Socket.IO 전용
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.access_token as string | undefined;
  if (!token) {
    next(new AppError(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.'));
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as { id: string; email: string };
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'AUTH_TOKEN_EXPIRED', '토큰이 만료되었습니다.'));
    } else {
      next(new AppError(401, 'AUTH_UNAUTHORIZED', '유효하지 않은 토큰입니다.'));
    }
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
  "iocModule": "src/ioc",
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
    "authenticationModule": "src/authentication",
    "basePath": "/api/v1"
  }
}
```

### 빌드 플로우

```
tsoa generate  →  src/generated/routes.gen.ts + src/generated/swagger.json 생성
tsc            →  TypeScript 컴파일
```

`src/generated/`는 `.gitignore` 대상이며, 개발/빌드 스크립트에서 자동으로 생성한다.

```json
// package.json scripts
{
  "generate": "tsoa generate",
  "dev": "tsoa generate && tsx watch src/server.ts",
  "build": "tsoa generate && tsc"
}
```

### 새 도메인 추가 체크리스트

1. `src/controllers/<domain>.controller.ts` — tsoa 데코레이터 + 생성자 주입
2. `src/ioc.ts` — 팩토리 등록
3. `tsoa generate` 실행 — 라우터 + 스펙 재생성
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
