// E2E 스택 전역 상수.
// .env 파일을 쓰지 않는 이유: 레포 .gitignore가 `.env*`를 전부 무시하므로 커밋할 수 없다.
// 대신 이 모듈의 값을 playwright.config.ts의 webServer.env로 주입한다.
// 여기 담긴 시크릿은 전부 로컬 전용 더미이며 운영 값과 절대 공유하지 않는다.

// 개발 스택(3000/4000/54322)과 포트를 분리해, dev 서버를 켜 둔 채로도 E2E를 돌릴 수 있게 한다.
export const FRONTEND_PORT = 3100;
export const BACKEND_PORT = 4100;

export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
export const API_URL = `${BACKEND_URL}/api/v1`;

export const DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:55432/syfity_e2e';

export const JWT_ACCESS_SECRET = 'e2e-access-secret';
export const JWT_REFRESH_SECRET = 'e2e-refresh-secret';

// 고정 UUID. backend의 isAuthPayload가 v4 UUID 형식을 검사하므로 형식을 지켜야 한다.
export const TEST_USERS = {
  host: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'e2e-host@syfity.test',
    nickname: 'E2E Host',
  },
  member: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'e2e-member@syfity.test',
    nickname: 'E2E Member',
  },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;

export const storageStatePath = (user: TestUserKey) => `e2e/.auth/${user}.json`;

// backend를 E2E 모드로 띄울 때 쓰는 환경변수 묶음.
// config.ts의 requireEnv가 Google·YouTube 값을 강제하므로 더미라도 채워야 부팅된다.
export const backendEnv: Record<string, string> = {
  NODE_ENV: 'development', // 쿠키 secure=false, sameSite=lax 유지에 필요
  PORT: String(BACKEND_PORT),
  CLIENT_URL: FRONTEND_URL,
  ALLOWED_ORIGINS: FRONTEND_URL,
  DATABASE_URL,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  CRON_SECRET: 'e2e-cron-secret',
  YOUTUBE_API_KEY: 'e2e-dummy-key',
  GOOGLE_CLIENT_ID: 'e2e-dummy-client-id',
  GOOGLE_CLIENT_SECRET: 'e2e-dummy-client-secret',
  GOOGLE_CALLBACK_URL: `${API_URL}/auth/google/callback`,
  // YouTube Fake Client 주입 스위치. 소비자(ioc.ts 분기)는 4단계에서 추가한다.
  E2E_MODE: 'true',
};

export const frontendEnv: Record<string, string> = {
  NEXT_PUBLIC_API_URL: API_URL,
  NEXT_PUBLIC_SOCKET_URL: BACKEND_URL,
  NEXT_PUBLIC_API_MOCKING: 'disabled', // MSW가 켜지면 인증 가드 자체를 건너뛴다
  // 개발용 `next dev`의 .next와 산출물을 분리한다 (next.config.ts에서 읽는다).
  NEXT_DIST_DIR: '.next-e2e',
};
