// 페이지 진입 헬퍼.
//
// 왜 단순한 page.goto()로 부족한가:
//   E2E는 프로덕션 빌드를 대상으로 하므로 서버가 완성된 HTML을 먼저 보낸다.
//   버튼은 이미 DOM에 있어 Playwright의 actionability 검사(보임·활성·안정)를 통과하지만,
//   React가 아직 하이드레이션을 끝내기 전이면 onClick이 붙어 있지 않아 클릭이 무시된다.
//   실패는 "다이얼로그가 안 열림 → 30초 타임아웃"으로 나타나 원인을 알아보기 어렵다.
//
// 그래서 각 페이지마다 "클라이언트 JS가 실제로 돌았다"는 신호를 하나 정해 기다린다.
import { expect, type Page } from '@playwright/test';

import { TEST_USERS, type TestUserKey } from './env';

/** Home 진입. 닉네임은 클라이언트의 useMe(TanStack Query)가 해석한 뒤에만 나타난다. */
export const gotoHome = async (page: Page, user: TestUserKey) => {
  await page.goto('/home');
  await expect(page.getByText(`안녕하세요, ${TEST_USERS[user].nickname}님 👋`)).toBeVisible();
};

/** Room 진입. 플레이어 스텁은 클라이언트에서만 붙으므로 하이드레이션 신호가 된다. */
export const gotoRoom = async (page: Page, roomId: string) => {
  await page.goto(`/room/${roomId}`);
  await expect(page.locator('[data-e2e-youtube-player]')).toBeAttached();
};

/**
 * 초대 링크로 Room에 입장한다.
 *
 * 버튼을 누르지 않는다. `useJoinRoomByCode`는 mutation이 아니라 `enabled` 옵션을 쓴
 * `useQuery`이고 초기 코드가 이미 채워져 있어, 링크로 들어오면 입장 요청이 자동으로 나간다.
 * 다이얼로그의 `입장하기` 버튼은 코드를 직접 입력하는 경우를 위한 것이다.
 * (`09-ui-ux-flow.md` §5.2의 "입장 중" 상태)
 */
export const joinRoomByInviteLink = async (page: Page, inviteCode: string) => {
  await page.goto(`/room/join?code=${inviteCode}`);

  await expect(page).toHaveURL(/\/room\/[0-9a-f-]{36}$/);
  await expect(page.locator('[data-e2e-youtube-player]')).toBeAttached();
};
