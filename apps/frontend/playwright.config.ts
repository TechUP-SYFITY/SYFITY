import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import {
  API_URL,
  backendEnv,
  BACKEND_URL,
  FRONTEND_PORT,
  FRONTEND_URL,
  frontendEnv,
} from './e2e/support/env';

const repoRoot = path.resolve(__dirname, '..', '..');

export default defineConfig({
  testDir: './e2e/specs',
  // Vitest의 기본 include(`**/*.{test,spec}.*`)와 겹치지 않도록 `.e2e.ts` 확장자를 쓴다.
  testMatch: /.*\.e2e\.ts/,

  globalSetup: './e2e/setup/global-setup.ts',

  // 단일 DB·단일 Socket 서버를 공유하므로 직렬 실행한다. 병렬화는 시나리오가 안정된 뒤 검토.
  fullyParallel: false,
  workers: 1,

  // 로컬에서 재시도로 flake를 덮지 않는다. CI에서만 1회 재시도.
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),

  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: FRONTEND_URL,
    // Room 화면의 멤버·채팅 패널은 Tailwind `xl`(1280px) 이상에서만 펼쳐지고,
    // 그 아래에서는 MobileTabs 뒤 드로어로 들어간다. Desktop Chrome 기본 1280px는
    // 경계에 정확히 걸려 위험하므로 여유 있는 크기로 고정한다.
    // 모바일 레이아웃 시나리오(E-14)는 해당 스펙에서 viewport를 따로 지정한다.
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // 개발 스택(3000/4000)과 포트를 분리했으므로, dev 서버를 켜 둔 채로 E2E를 돌려도 충돌하지 않는다.
  webServer: [
    {
      name: 'backend',
      // 생성물(src/generated)은 gitignore 대상이라 매번 만들어야 한다.
      // prisma generate를 빼면 스키마와 클라이언트가 어긋난 채로 테스트가 돌아
      // enum 누락 같은 문제가 런타임 500으로만 드러난다.
      command: [
        'pnpm --filter backend exec prisma generate',
        'pnpm --filter backend generate',
        'pnpm --filter backend exec tsx src/server.ts',
      ].join(' && '),
      cwd: repoRoot,
      url: `${API_URL}/health`,
      env: backendEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      name: 'frontend',
      // `next dev`가 아니라 프로덕션 빌드를 쓰는 이유:
      //   1) Next 16은 같은 디렉터리에서 dev 서버를 하나만 허용한다. 개발용 dev 서버(:3000)를
      //      켜 둔 상태로 E2E를 돌리려면 dev 모드로는 불가능하다.
      //   2) E2E는 배포되는 산출물을 검증하는 편이 맞고, HMR로 인한 flake도 사라진다.
      command: [
        'pnpm --filter @syfity/shared build',
        'pnpm --filter frontend exec next build',
        `pnpm --filter frontend exec next start -p ${FRONTEND_PORT}`,
      ].join(' && '),
      cwd: repoRoot,
      url: FRONTEND_URL,
      env: { ...frontendEnv, NEXT_PUBLIC_SOCKET_URL: BACKEND_URL },
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
