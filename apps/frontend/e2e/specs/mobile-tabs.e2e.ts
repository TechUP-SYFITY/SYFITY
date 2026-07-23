// xl(1280px) 미만에서는 멤버·재생목록·채팅 사이드 패널이 하단 탭으로 접힌다.
// 데스크톱 패널은 사라지지 않고 display:none으로 DOM에 남아 있어(iOS 오디오 유지 목적),
// 같은 문구가 화면에 둘씩 존재한다. 그래서 단언은 실제로 열린 모바일 패널 컨테이너로 좁힌다.
// 탭 전환은 RoomShell 상태와 Radix Tabs·Dialog가 얽혀 열림/닫힘 레이스가 나기 쉬운 지점이라,
// 탭 하나가 정확히 한 패널만 여는지 실제 뷰포트에서 확인한다.
import { expect, test } from '../fixtures/test';
import { createRoom } from '../support/api';
import { resetRoomData } from '../support/db';
import { storageStatePath, TEST_USERS } from '../support/env';
import { gotoRoom } from '../support/pages';

// 데스크톱 패널이 접히고 하단 탭이 나타나는 모바일 크기.
test.use({ storageState: storageStatePath('host'), viewport: { height: 844, width: 390 } });

test.beforeEach(async () => {
  await resetRoomData();
});

// 열린 탭의 내용은 오버레이(짧은 뷰포트) 또는 인페이지(긴 뷰포트) 어느 한쪽에만 붙는다.
// 두 모드를 모두 잡되 데스크톱 hidden 사본은 제외하도록 컨테이너로 스코프한다.
const mobilePanel = (page: Parameters<typeof gotoRoom>[0]) =>
  page.locator('[data-testid="room-mobile-overlay"], [data-testid="room-tall-viewport-panel"]');

test('모바일에서는 사이드 패널 대신 하단 탭이 보인다', async ({ page, request }) => {
  const room = await createRoom(request, 'host', 'E2E 모바일');
  await gotoRoom(page, room.id);

  // xl 이상에서만 펼쳐지는 이름 없는 사이드 패널은 모바일 접근성 트리에 없다.
  await expect(page.getByRole('complementary')).toHaveCount(0);

  await expect(page.getByRole('tab', { name: '재생목록' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '멤버' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '채팅' })).toBeVisible();
});

test('탭을 바꾸면 한 번에 한 패널만 열린다', async ({ page, request }) => {
  const room = await createRoom(request, 'host', 'E2E 모바일');
  await gotoRoom(page, room.id);

  // 재생목록: 빈 방이라 empty 상태 문구로 확인한다.
  await page.getByRole('tab', { name: '재생목록' }).click();
  await expect(mobilePanel(page).getByText('아직 곡이 없어요')).toBeVisible();

  // 채팅으로 바꾸면 재생목록은 닫히고 채팅 입력이 나타난다.
  await page.getByRole('tab', { name: '채팅' }).click();
  await expect(mobilePanel(page).getByRole('textbox', { name: '채팅 메시지 입력' })).toBeVisible();
  await expect(mobilePanel(page).getByText('아직 곡이 없어요')).toBeHidden();

  // 멤버 탭에는 접속자(Host)가 보인다.
  await page.getByRole('tab', { name: '멤버' }).click();
  await expect(mobilePanel(page).getByText(TEST_USERS.host.nickname)).toBeVisible();
  await expect(mobilePanel(page).getByRole('textbox', { name: '채팅 메시지 입력' })).toBeHidden();
});

test('열린 탭을 다시 누르면 패널이 닫힌다', async ({ page, request }) => {
  const room = await createRoom(request, 'host', 'E2E 모바일');
  await gotoRoom(page, room.id);

  await page.getByRole('tab', { name: '재생목록' }).click();
  await expect(mobilePanel(page).getByText('아직 곡이 없어요')).toBeVisible();

  await page.getByRole('tab', { name: '재생목록' }).click();
  await expect(mobilePanel(page).getByText('아직 곡이 없어요')).toBeHidden();
});
