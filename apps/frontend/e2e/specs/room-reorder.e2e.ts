// E-08 Playlist 순서 변경 (Host 전용).
//
// 순서 변경은 드래그앤드롭이 주 조작이지만, 드래그 핸들은 ArrowUp/ArrowDown 키보드도
// 지원한다(PlaylistItemRow의 onDragHandleKeyDown). E2E에서는 키보드 경로를 쓴다.
// 포인터 드래그는 좌표·타이밍에 의존해 flake가 잦고, 여기서 확인하려는 건
// "순서가 서버에 반영되고 Member에게 전파되는가"이지 드래그 제스처 자체가 아니다.
import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/test';
import { addPlaylistItem } from '../support/api';
import { resetRoomData } from '../support/db';
import { openRoomWithHostAndMember, playlistPanel } from '../support/room-session';

const TRACK_1 = 'E2E 테스트 트랙 01';
const TRACK_2 = 'E2E 테스트 트랙 02';

/** 재생목록에 보이는 곡 제목을 위에서부터 순서대로 읽는다. */
const readOrder = (page: Page) =>
  playlistPanel(page)
    .locator('[data-playlist-item-id]')
    .evaluateAll((rows) => rows.map((row) => row.querySelector('p')?.textContent?.trim() ?? ''));

test.beforeEach(async () => {
  await resetRoomData();
});

test('Host가 바꾼 재생목록 순서가 Member에게도 반영된다', async ({ request, openPageAs }) => {
  const { room, hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await addPlaylistItem(request, 'host', room.id, 'e2eTrack001');
  await addPlaylistItem(request, 'host', room.id, 'e2eTrack002');

  for (const page of [hostPage, memberPage]) {
    await expect(playlistPanel(page).getByRole('heading', { name: '재생목록 2곡' })).toBeVisible();
    expect(await readOrder(page)).toEqual([TRACK_1, TRACK_2]);
  }

  // 핸들은 행에 포커스가 없으면 opacity 0이지만 DOM에는 있으므로 포커스가 가능하다.
  const handle = hostPage.getByRole('button', { name: `${TRACK_1} 순서 변경` });
  await handle.focus();
  await handle.press('ArrowDown');

  // 서버 PATCH → playlist:updated 브로드캐스트까지 기다린다.
  await expect.poll(() => readOrder(memberPage)).toEqual([TRACK_2, TRACK_1]);
  expect(await readOrder(hostPage)).toEqual([TRACK_2, TRACK_1]);
});

test('Member에게는 순서 변경 핸들이 보이지 않는다', async ({ request, openPageAs }) => {
  const { room, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await addPlaylistItem(request, 'host', room.id, 'e2eTrack001');
  await expect(playlistPanel(memberPage).getByText(TRACK_1)).toBeVisible();

  // 드래그 핸들은 isHost일 때만 렌더된다.
  await expect(memberPage.getByRole('button', { name: `${TRACK_1} 순서 변경` })).toHaveCount(0);

  // Host가 추가한 곡이므로 Member는 삭제도 할 수 없다(05-api-spec.md §6.3).
  await expect(memberPage.getByRole('button', { name: `${TRACK_1} 삭제` })).toHaveCount(0);
});

// readOrder가 빈 배열만 반환하는 상태로 망가지면 위의 순서 단언이 조용히 무의미해진다.
// 목록이 비었을 때와 아닐 때가 실제로 구분되는지 확인해 헬퍼를 보증한다.
test('재생목록이 비어 있으면 읽을 순서도 없다', async ({ request, openPageAs }) => {
  const { room, hostPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await expect(playlistPanel(hostPage).getByText('아직 곡이 없어요')).toBeVisible();
  expect(await readOrder(hostPage)).toEqual([]);

  await addPlaylistItem(request, 'host', room.id, 'e2eTrack001');
  await expect.poll(() => readOrder(hostPage)).toEqual([TRACK_1]);
});
