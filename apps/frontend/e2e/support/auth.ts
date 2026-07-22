// 테스트 전용 인증 주입.
// 실제 Google OAuth를 태우지 않고, backend와 동일한 시크릿으로 서명한 JWT를 쿠키로 심는다.
//
// 이게 성립하는 이유:
//   - backend/src/authentication.ts (REST)와 backend/src/socket/socketAuth.ts (Socket)가
//     모두 같은 `access_token` 쿠키를 JWT_ACCESS_SECRET으로 검증한다.
//   - 쿠키는 포트를 구분하지 않으므로 domain=localhost 쿠키 하나로 FE·BE 양쪽에 전달된다.
//   - 단, authentication.ts가 DB에서 user를 조회하므로 seedTestUsers가 선행되어야 한다.
//     (토큰만 만들면 401이 아니라 404 AUTH_USER_NOT_FOUND가 난다)
import type { Cookie } from '@playwright/test';
import jwt from 'jsonwebtoken';

import { JWT_ACCESS_SECRET, TEST_USERS, type TestUserKey } from './env';

// 운영의 access token은 1시간이지만, 테스트 토큰은 일부러 길게 잡는다.
//
// 짧게 잡으면 시한폭탄이 된다. storageState는 globalSetup에서 한 번만 만들어지는데,
// `--ui` 모드는 globalSetup을 최초 1회만 실행하므로 UI를 오래 열어 두면 토큰이 만료된다.
// 만료되면 /me가 401 AUTH_TOKEN_EXPIRED → apiClient가 refresh 시도 → refresh_token 쿠키를
// 주입하지 않았으므로 실패 → /login으로 튕기고, 테스트는 "element(s) not found"로만 실패해
// 원인을 알아보기 어렵다.
//
// 토큰 만료·refresh 동작 자체는 이 상수에 기대지 말고, 만료된 토큰을 의도적으로 만드는
// 전용 시나리오(§9 P1)로 검증한다.
const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export const signAccessToken = (
  user: TestUserKey,
  { expiresIn = ACCESS_TOKEN_TTL_SECONDS }: { expiresIn?: number } = {},
) => {
  const { id, email } = TEST_USERS[user];
  return jwt.sign({ id, email }, JWT_ACCESS_SECRET, { expiresIn });
};

export const createAuthCookie = (
  user: TestUserKey,
  { expiresIn = ACCESS_TOKEN_TTL_SECONDS }: { expiresIn?: number } = {},
): Cookie => ({
  name: 'access_token',
  value: signAccessToken(user, { expiresIn }),
  domain: 'localhost',
  path: '/',
  // JWT가 만료된 상태를 재현하려면 쿠키 자체는 살아 있어야 한다.
  // 쿠키까지 만료되면 브라우저가 지워 버려 "토큰 없음" 경로로 빠진다.
  expires: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
  httpOnly: true,
  secure: false, // 로컬 backend는 NODE_ENV=development라 secure 쿠키를 쓰지 않는다
  sameSite: 'Lax',
});

/** Playwright storageState 파일 형식. 브라우저를 띄우지 않고 직접 만든다. */
export const createStorageState = (user: TestUserKey) => ({
  cookies: [createAuthCookie(user)],
  origins: [],
});
