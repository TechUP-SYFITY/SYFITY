// Home은 "최근 참여한 방"과 "내 Room" 두 목록을 제공한다.
// 전자는 재입장 동선이고, 후자는 Host가 종료한 Room을 되살리거나 완전히 접는 흐름이다.
// 복구는 Playlist·재생 세션 초기화를 동반하고, 비활성화는 목록·재입장·복구를 모두 막는다.
// 상태 전이가 REST와 Socket, 화면 목록에 걸쳐 있어 통합 확인이 필요하다.
import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/test';
import { addPlaylistItem, createRoom } from '../support/api';
import { resetRoomData } from '../support/db';
import { storageStatePath } from '../support/env';
import { gotoHome, gotoRoom } from '../support/pages';
import { openRoomWithHostAndMember, playlistPanel } from '../support/room-session';

test.use({ storageState: storageStatePath('host') });

test.beforeEach(async () => {
  await resetRoomData();
});

/** Room을 만들고 곡을 넣은 뒤 Host가 종료한다. 복구·비활성화의 사전 조건. */
const createClosedRoom = async (
  page: Page,
  request: Parameters<typeof createRoom>[0],
  name: string,
) => {
  const room = await createRoom(request, 'host', name);
  await addPlaylistItem(request, 'host', room.id, 'e2eTrack001');

  await gotoRoom(page, room.id);
  await expect(playlistPanel(page).getByText('E2E 테스트 트랙 01')).toBeVisible();

  await page.getByRole('button', { name: 'Room 종료', exact: true }).click();
  await page.getByRole('button', { name: 'Room 종료 확인' }).click();
  await expect(page).toHaveURL('/home');

  return room;
};

test('종료한 Room이 내 Room 목록에 종료 상태로 남는다', async ({ page, request }) => {
  const room = await createClosedRoom(page, request, '어제의 방');

  // "내 Room" 섹션은 heading만 있고 aria-label이 없어 이름 있는 region으로 잡히지 않는다.
  await expect(page.getByRole('heading', { level: 2, name: '내 Room' })).toBeVisible();
  await expect(page.getByText(room.name)).toBeVisible();
  await expect(page.getByText('종료됨')).toBeVisible();

  // closed Room에는 입장 대신 복구·비활성화만 제공된다(09-ui-ux-flow.md §5.1).
  await expect(page.getByRole('button', { name: `${room.name} 복구` })).toBeVisible();
  await expect(page.getByRole('button', { name: `${room.name} 비활성화` })).toBeVisible();
});

test('복구한 Room에 다시 입장할 수 있고 Playlist는 초기화된다', async ({ page, request }) => {
  const room = await createClosedRoom(page, request, '되살릴 방');

  await page.getByRole('button', { name: `${room.name} 복구` }).click();
  await expect(page.getByText('Room을 복구할까요?')).toBeVisible();
  await page.getByRole('button', { name: 'Room 복구 확인' }).click();

  // 복구는 Home에 머무르지 않고 곧바로 해당 Room으로 이동시킨다.
  await expect(page).toHaveURL(`/room/${room.id}`);
  await expect(page.getByRole('heading', { level: 1, name: room.name })).toBeVisible();

  // 종료 전에 있던 곡은 남지 않는다. 복구가 Playlist와 재생 세션을 초기화한다.
  await expect(playlistPanel(page).getByText('아직 곡이 없어요')).toBeVisible();
  await expect(playlistPanel(page).getByText('E2E 테스트 트랙 01')).toBeHidden();
});

test('비활성화한 Room은 목록에서 사라지고 재입장할 수 없다', async ({ page, request }) => {
  const room = await createClosedRoom(page, request, '접을 방');

  await page.getByRole('button', { name: `${room.name} 비활성화` }).click();
  await expect(page.getByText('Room을 비활성화할까요?')).toBeVisible();
  await page.getByRole('button', { name: 'Room 비활성화 확인' }).click();

  await expect(page.getByText(room.name)).toBeHidden();

  // 초대 코드로도 들어갈 수 없다.
  await page.goto(`/room/join?code=${room.inviteCode}`);
  await expect(page.getByText('입장할 수 없는 방이에요')).toBeVisible();
});

test('확인 다이얼로그를 취소하면 상태가 그대로다', async ({ page, request }) => {
  const room = await createClosedRoom(page, request, '그대로 둘 방');

  await page.getByRole('button', { name: `${room.name} 비활성화` }).click();
  await page.getByRole('button', { name: '취소' }).click();
  await expect(page.getByText('Room을 비활성화할까요?')).toBeHidden();

  await gotoHome(page, 'host');
  await expect(page.getByRole('button', { name: `${room.name} 복구` })).toBeVisible();
});

test('최근 참여한 방 카드로 다시 들어간다', async ({ request, openPageAs }) => {
  const { room, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  // 최근 참여 이력은 초대 코드 입장(POST /room-memberships)에서 쌓인다.
  await memberPage.getByRole('button', { name: '나가기' }).click();
  await expect(memberPage).toHaveURL('/home');

  await expect(memberPage.getByRole('heading', { level: 2, name: '최근 참여한 방' })).toBeVisible();

  // 카드는 aria-label 없이 방 이름이 접근성 이름이 된다.
  await memberPage.getByRole('button', { name: new RegExp(room.name) }).click();

  await expect(memberPage).toHaveURL(`/room/${room.id}`);
  await expect(memberPage.getByRole('heading', { level: 1, name: room.name })).toBeVisible();
});
