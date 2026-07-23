// Host와 Member가 같은 Room에 들어와 있는 상태를 만든다.
//
// E-04~E-07은 모두 이 상태에서 출발하므로 한 곳에 모아 둔다.
// 이 흐름 자체를 검증하는 건 E-03(room-join.e2e.ts)이고, 여기서는 사전 조건으로만 쓴다.
import { expect, type APIRequestContext, type Page } from '@playwright/test';

import { createRoom, type CreatedRoom } from './api';
import { type TestUserKey } from './env';
import { gotoRoom, joinRoomByInviteLink } from './pages';

interface RoomSession {
  room: CreatedRoom;
  hostPage: Page;
  memberPage: Page;
}

export const openRoomWithHostAndMember = async (
  {
    request,
    openPageAs,
  }: {
    request: APIRequestContext;
    openPageAs: (user: TestUserKey) => Promise<Page>;
  },
  roomName = 'E2E Room',
): Promise<RoomSession> => {
  const room = await createRoom(request, 'host', roomName);

  const hostPage = await openPageAs('host');
  await gotoRoom(hostPage, room.id);
  // Host의 Socket이 Room에 붙은 뒤에 Member를 넣어야 전파를 받을 수 있다.
  await expect(hostPage.getByText('1명 접속 중')).toBeVisible();

  const memberPage = await openPageAs('member');
  await joinRoomByInviteLink(memberPage, room.inviteCode);

  // 양쪽 모두 서로를 인식한 뒤에 시나리오를 시작한다.
  await expect(hostPage.getByText('2명 접속 중')).toBeVisible();
  await expect(memberPage.getByText('2명 접속 중')).toBeVisible();

  return { room, hostPage, memberPage };
};

/** Room 화면의 사이드 패널은 모두 이름 없는 complementary라 내용으로 구분한다. */
export const chatPanel = (page: Page) =>
  page.getByRole('complementary').filter({ hasText: '채팅' });

export const memberPanel = (page: Page) =>
  page.getByRole('complementary').filter({ hasText: '멤버' });

export const playlistPanel = (page: Page) =>
  page.getByRole('complementary').filter({ hasText: '재생목록' });

export const sendChatMessage = async (page: Page, message: string) => {
  await page.getByRole('textbox', { name: '채팅 메시지 입력' }).fill(message);
  await page.getByRole('button', { name: '메시지 보내기' }).click();
};

/** 곡 추가 패널을 연다. 검색 결과는 FakeYouTubeClient의 고정 카탈로그에서 나온다. */
export const openSearchPanel = async (page: Page, query: string) => {
  // 빈 상태의 "첫 번째 곡 추가"와 헤더의 "추가"가 모두 같은 경로로 이어진다. 헤더 쪽을 쓴다.
  await playlistPanel(page).getByRole('button', { name: '추가', exact: true }).click();

  // PlaylistAddMenu는 역할에 따라 동작이 다르다(showImport 분기).
  //  - Host: "검색으로 추가 / 내 플레이리스트 불러오기" 드롭다운이 먼저 열린다.
  //  - 그 외: 같은 버튼이 검색 패널을 바로 연다.
  // 어느 쪽이 뜨는지 기다린 뒤 분기해야 경쟁 없이 안정적이다.
  const searchMenuItem = page.getByRole('menuitem', { name: '검색으로 추가' });
  const panel = page.getByRole('dialog', { name: '곡 추가' });
  await expect(searchMenuItem.or(panel).first()).toBeVisible();

  if (await searchMenuItem.isVisible()) {
    await searchMenuItem.click();
  }

  await expect(panel).toBeVisible();
  await panel.getByPlaceholder('YouTube 영상 검색 또는 링크 붙여넣기').fill(query);
  return panel;
};

export const closeSearchPanel = async (page: Page) => {
  await page.getByRole('button', { name: '검색 패널 닫기' }).click();
  await expect(page.getByRole('dialog', { name: '곡 추가' })).toBeHidden();
};
