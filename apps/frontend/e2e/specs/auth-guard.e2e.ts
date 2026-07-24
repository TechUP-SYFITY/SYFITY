// 인증 주입(JWT 쿠키)이 proxy(Edge) → protected layout(RSC의 GET /me) → 화면 렌더까지
// 실제로 관통하는지 확인하는 기준점. 이후 모든 시나리오가 이 전제 위에 선다.
import { expect, test } from '../fixtures/test';
import { createAuthCookie } from '../support/auth';
import { storageStatePath, TEST_USERS } from '../support/env';
import { gotoHome } from '../support/pages';

test.describe('비로그인 사용자', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('보호 페이지 접근 시 원래 경로를 returnUrl로 보존해 로그인으로 보낸다', async ({ page }) => {
    await page.goto('/home');

    await expect(page).toHaveURL(`/login?returnUrl=${encodeURIComponent('/home')}`);
  });

  test('Room 경로도 동일하게 막는다', async ({ page }) => {
    await page.goto('/room/some-room-id');

    await expect(page).toHaveURL(`/login?returnUrl=${encodeURIComponent('/room/some-room-id')}`);
  });
});

test.describe('인증 주입된 사용자', () => {
  test.use({ storageState: storageStatePath('host') });

  test('Home에 진입해 자신의 닉네임을 본다', async ({ page }) => {
    await page.goto('/home');

    // URL이 유지된다 = proxy와 protected layout의 GET /me를 모두 통과했다는 뜻.
    await expect(page).toHaveURL('/home');
    await expect(page.getByText(`안녕하세요, ${TEST_USERS.host.nickname}님 👋`)).toBeVisible();
  });

  test('로그인 페이지로 가면 Home으로 되돌린다', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL('/home');
  });
});

test.describe('만료된 토큰', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // 쿠키는 살아 있지만 JWT만 만료된 상태.
  // proxy는 쿠키 존재만 보고 통과시키고, protected layout도 AUTH_TOKEN_EXPIRED는 통과시킨다.
  // 이후 클라이언트 apiClient가 refresh를 시도했다가 실패하면서 로그인으로 되돌린다.
  //
  // 이 과정에서 리다이렉트가 여러 번 일어나고(`?reauth=1` → 쿠키 삭제 → `?returnUrl=...`)
  // 최종 쿼리스트링이 달라질 수 있으므로, 경로만 확인한다.
  test('refresh까지 실패하면 로그인 화면으로 되돌린다', async ({ context, page }) => {
    await context.addCookies([createAuthCookie('host', { expiresIn: -60 })]);

    await page.goto('/home');

    await expect(page).toHaveURL(/\/login(\?|$)/);
    await expect(page.getByText(`안녕하세요, ${TEST_USERS.host.nickname}님 👋`)).toBeHidden();
  });
});

test.describe('로그아웃', () => {
  test.use({ storageState: storageStatePath('host') });

  test('로그아웃하면 세션이 끊기고 보호 페이지에 접근할 수 없다', async ({ page }) => {
    await gotoHome(page, 'host');

    await page.getByRole('button', { name: '사용자 메뉴' }).click();
    await page.getByRole('menuitem', { name: '로그아웃' }).click();

    // 도착 지점은 확정적이지 않다. useLogout은 window.location.href = '/'로 보내지만,
    // 쿠키가 지워진 뒤 남아 있던 쿼리가 401을 받으면 apiClient가 '/login?reauth=1'로
    // 되돌린다. 두 이동이 경쟁하므로 실행마다 결과가 갈린다.
    // 둘 다 로그아웃된 상태이므로 "보호 페이지를 벗어났다"까지만 단언한다.
    await expect(page).not.toHaveURL(/\/home/);

    // 정작 확인할 것은 세션이 실제로 끊겼는지다.
    // 쿠키가 남아 있으면 proxy가 통과시켜 /home에 머문다.
    await page.goto('/home');
    await expect(page).toHaveURL(`/login?returnUrl=${encodeURIComponent('/home')}`);
  });
});
