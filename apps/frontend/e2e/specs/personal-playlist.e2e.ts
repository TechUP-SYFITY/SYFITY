// Room과 독립적인 개인 보관함이지만, Room으로 불러오는 순간 Playlist 브로드캐스트를 타고
// 다른 참여자 화면까지 닿는다. 그 연결이 E2E로만 확인되는 부분이다.
//
// 상세 화면은 Room과 같은 SearchPanel·PlaylistItemRow를 재사용하므로
// 곡 추가·삭제 로케이터도 Room 시나리오와 같다.
import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/test';
import { resetRoomData } from '../support/db';
import { storageStatePath } from '../support/env';
import { gotoHome } from '../support/pages';
import { openRoomWithHostAndMember, playlistPanel } from '../support/room-session';

const TRACK = 'E2E 테스트 트랙 01';

test.use({ storageState: storageStatePath('host') });

test.beforeEach(async () => {
  await resetRoomData();
});

/** 사용자 메뉴를 거쳐 내 플레이리스트로 들어간다. */
const gotoLibrary = async (page: Page) => {
  await gotoHome(page, 'host');
  await page.getByRole('button', { name: '사용자 메뉴' }).click();
  // Radix DropdownMenuItem이 Link를 감싸고 있어 노출되는 역할은 link가 아니라 menuitem이다.
  await page.getByRole('menuitem', { name: '내 플레이리스트' }).click();

  await expect(page).toHaveURL('/playlists');
  await expect(page.getByRole('heading', { level: 1, name: '내 플레이리스트' })).toBeVisible();
};

const createPlaylist = async (page: Page, name: string) => {
  await page.getByRole('button', { name: '새 플레이리스트' }).first().click();
  await page.getByLabel('이름').fill(name);
  await page.getByRole('button', { name: '만들기' }).click();
};

test('사용자 메뉴에서 들어가 Playlist를 만들고 삭제한다', async ({ page }) => {
  await gotoLibrary(page);
  await expect(page.getByText('아직 플레이리스트가 없어요')).toBeVisible();

  await createPlaylist(page, '밤 드라이브');
  await expect(page.getByText('밤 드라이브')).toBeVisible();

  await page.getByRole('link', { name: /밤 드라이브/ }).click();
  await expect(page).toHaveURL(/\/playlists\/[0-9a-f-]{36}$/);

  await page.getByRole('button', { name: '플레이리스트 삭제' }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();

  await expect(page).toHaveURL('/playlists');
  await expect(page.getByText('아직 플레이리스트가 없어요')).toBeVisible();
});

test('Playlist에 곡을 추가하고 삭제한다', async ({ page }) => {
  await gotoLibrary(page);
  await createPlaylist(page, '출근길');
  await page.getByRole('link', { name: /출근길/ }).click();

  await page.getByRole('button', { name: '곡 추가' }).first().click();
  const panel = page.getByRole('dialog', { name: '곡 추가' });
  await panel.getByPlaceholder('YouTube 영상 검색 또는 링크 붙여넣기').fill('테스트 트랙 01');
  await panel.getByRole('button', { name: `${TRACK} 추가` }).click();
  await page.getByRole('button', { name: '검색 패널 닫기' }).click();

  await expect(page.getByText(TRACK)).toBeVisible();

  await page.getByRole('button', { name: `${TRACK} 삭제` }).click();
  await expect(page.getByText(TRACK)).toBeHidden();
});

test('Host가 개인 Playlist를 Room으로 불러오면 Member에게도 반영된다', async ({
  request,
  openPageAs,
}) => {
  // 먼저 개인 Playlist에 곡을 채워 둔다.
  const libraryPage = await openPageAs('host');
  await gotoLibrary(libraryPage);
  await createPlaylist(libraryPage, '파티 모음');
  await libraryPage.getByRole('link', { name: /파티 모음/ }).click();

  await libraryPage.getByRole('button', { name: '곡 추가' }).first().click();
  const panel = libraryPage.getByRole('dialog', { name: '곡 추가' });
  await panel.getByPlaceholder('YouTube 영상 검색 또는 링크 붙여넣기').fill('테스트 트랙 01');
  await panel.getByRole('button', { name: `${TRACK} 추가` }).click();
  await libraryPage.getByRole('button', { name: '검색 패널 닫기' }).click();
  await expect(libraryPage.getByText(TRACK)).toBeVisible();

  // 같은 사용자가 Room을 열고 불러온다.
  const { hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await playlistPanel(hostPage).getByRole('button', { name: '추가', exact: true }).click();
  await hostPage.getByRole('menuitem', { name: '내 플레이리스트 불러오기' }).click();

  // 목록에서 고른 뒤 확인 버튼을 눌러야 실제로 반영된다.
  await hostPage.getByRole('button', { name: /파티 모음/ }).click();
  await hostPage.getByRole('button', { name: '끝에 추가' }).click();

  // 불러오기는 Room Playlist를 바꾸므로 Member 화면까지 전파되어야 한다.
  for (const page of [hostPage, memberPage]) {
    await expect(playlistPanel(page).getByText(TRACK)).toBeVisible();
  }
});
