// E-04 Playlist 추가·삭제.
//
// 4단계에서 만든 FakeYouTubeClient 카탈로그를 처음으로 UI에서 쓴다.
// 검색과 곡 추가는 서버가 YouTube를 호출하므로 스텁 없이는 실제 API 키와
// 매번 달라지는 결과에 의존하게 된다.
import { expect, test } from '../fixtures/test';
import { resetRoomData } from '../support/db';
import {
  closeSearchPanel,
  openRoomWithHostAndMember,
  openSearchPanel,
  playlistPanel,
} from '../support/room-session';

const TRACK_TITLE = 'E2E 테스트 트랙 01';

test.beforeEach(async () => {
  await resetRoomData();
});

test('Host가 추가·삭제한 곡이 Member 화면에도 실시간 반영된다', async ({ request, openPageAs }) => {
  const { hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await expect(playlistPanel(hostPage).getByText('아직 곡이 없어요')).toBeVisible();

  const panel = await openSearchPanel(hostPage, '테스트 트랙 01');
  await panel.getByRole('button', { name: `${TRACK_TITLE} 추가` }).click();
  await closeSearchPanel(hostPage);

  // 추가한 Host와, playlist:updated 브로드캐스트를 받은 Member 양쪽에서 확인한다.
  for (const page of [hostPage, memberPage]) {
    await expect(playlistPanel(page).getByText(TRACK_TITLE)).toBeVisible();
    await expect(playlistPanel(page).getByRole('heading', { name: '재생목록 1곡' })).toBeVisible();
  }

  await playlistPanel(hostPage)
    .getByRole('button', { name: `${TRACK_TITLE} 삭제` })
    .click();

  for (const page of [hostPage, memberPage]) {
    await expect(playlistPanel(page).getByText(TRACK_TITLE)).toBeHidden();
    await expect(playlistPanel(page).getByText('아직 곡이 없어요')).toBeVisible();
  }
});

test('임베드가 막힌 곡은 추가되지 않는다', async ({ request, openPageAs }) => {
  const { hostPage } = await openRoomWithHostAndMember({ request, openPageAs });

  const panel = await openSearchPanel(hostPage, '임베드 불가');
  await panel.getByRole('button', { name: 'E2E 임베드 불가 트랙 추가' }).click();

  // 먼저 서버가 실제로 거절했다는 신호(오류 토스트)를 기다린다.
  // 이걸 건너뛰고 목록만 보면, 추가가 느릴 때 "아직 안 나타남"으로 헛통과할 수 있다.
  // PLAYLIST_VIDEO_UNAVAILABLE → errorMessage.ts가 이 문구로 매핑한다.
  // exact를 주는 이유: 토스트는 화면용 요소와 스크린리더용 live region
  // ("Notification ..." 접두사)에 동시에 그려져 부분 일치로는 둘 다 잡힌다.
  await expect(hostPage.getByText('재생할 수 없는 영상이에요.', { exact: true })).toBeVisible();

  await closeSearchPanel(hostPage);
  await expect(playlistPanel(hostPage).getByText('E2E 임베드 불가 트랙')).toBeHidden();
  await expect(playlistPanel(hostPage).getByText('아직 곡이 없어요')).toBeVisible();
});

test('검색 결과가 없으면 곡을 추가할 수 없다', async ({ request, openPageAs }) => {
  const { hostPage } = await openRoomWithHostAndMember({ request, openPageAs });

  const panel = await openSearchPanel(hostPage, '카탈로그에 없는 검색어');

  // 빈 상태가 뜬 뒤에 세어야 한다. 디바운스로 아직 검색 전이어도 결과 0개라 헛통과한다.
  await expect(panel.getByText('검색 결과가 없어요')).toBeVisible();
  await expect(panel.getByRole('button', { name: /추가$/ })).toHaveCount(0);
});
