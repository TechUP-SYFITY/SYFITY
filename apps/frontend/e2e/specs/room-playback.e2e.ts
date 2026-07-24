// E-06 재생 제어 전파 (축소판).
//
// 범위를 의도적으로 좁혔다. 검증 대상은 "Host의 명령이 Socket을 타고 Member 화면에
// 반영되는가"뿐이다. 실제 소리·광고·버퍼링은 PRD §8.1대로 수동 검증으로 분리하고,
// 오차 보정(playerSync.getPlaybackCorrection)과 10초 tick 주기는 E2E로 다루지 않는다.
// 시간에 의존하는 단언은 브라우저 두 개를 띄운 상태에서 flake의 주범이 되고,
// 순수 함수는 단위 테스트가 훨씬 싸고 정확하다.
//
// 재생 상태는 5단계에서 심은 플레이어 스텁이 DOM 속성으로 노출한다.
import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/test';
import { addPlaylistItem } from '../support/api';
import { resetRoomData } from '../support/db';
import {
  closeSearchPanel,
  openRoomWithHostAndMember,
  openSearchPanel,
  playlistPanel,
} from '../support/room-session';

const player = (page: Page) => page.locator('[data-e2e-youtube-player]');

test.beforeEach(async () => {
  await resetRoomData();
});

test('Host의 재생·일시정지가 Member 플레이어에 그대로 반영된다', async ({
  request,
  openPageAs,
}) => {
  const { hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  const panel = await openSearchPanel(hostPage, '테스트 트랙 01');
  await panel.getByRole('button', { name: 'E2E 테스트 트랙 01 추가' }).click();
  await closeSearchPanel(hostPage);
  await expect(playlistPanel(hostPage).getByText('E2E 테스트 트랙 01')).toBeVisible();

  // 곡을 추가해도 현재 곡은 정해지지 않는다. 재생을 눌러야 서버가 첫 곡을 고른다.
  await expect(player(hostPage)).toHaveAttribute('data-e2e-video-id', '');
  await hostPage.getByRole('button', { name: '재생' }).click();

  for (const page of [hostPage, memberPage]) {
    await expect(player(page)).toHaveAttribute('data-e2e-video-id', 'e2eTrack001');
    await expect(player(page)).toHaveAttribute('data-e2e-playing', 'true');
  }

  // 버튼 라벨이 바뀌는 것 자체가 Host 화면의 재생 상태를 사용자 눈높이에서 확인해 준다.
  await hostPage.getByRole('button', { name: '일시정지' }).click();

  for (const page of [hostPage, memberPage]) {
    await expect(player(page)).toHaveAttribute('data-e2e-playing', 'false');
    // 일시정지는 곡을 바꾸지 않는다.
    await expect(player(page)).toHaveAttribute('data-e2e-video-id', 'e2eTrack001');
  }
});

test('Host가 다음 곡으로 넘기면 Member도 같은 곡으로 바뀐다', async ({ request, openPageAs }) => {
  const { room, hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  // 곡 두 개는 사전 조건일 뿐이므로 REST로 만든다. 추가 흐름 자체는 E-04가 검증한다.
  await addPlaylistItem(request, 'host', room.id, 'e2eTrack001');
  await addPlaylistItem(request, 'host', room.id, 'e2eTrack002');
  await expect(
    playlistPanel(hostPage).getByRole('heading', { name: '재생목록 2곡' }),
  ).toBeVisible();

  await hostPage.getByRole('button', { name: '재생' }).click();
  for (const page of [hostPage, memberPage]) {
    await expect(player(page)).toHaveAttribute('data-e2e-video-id', 'e2eTrack001');
  }

  await hostPage.getByRole('button', { name: '다음 곡' }).click();

  for (const page of [hostPage, memberPage]) {
    await expect(player(page)).toHaveAttribute('data-e2e-video-id', 'e2eTrack002');
    await expect(player(page)).toHaveAttribute('data-e2e-playing', 'true');
  }
});

test('Member에게는 재생 제어 권한이 없다', async ({ request, openPageAs }) => {
  const { room, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await addPlaylistItem(request, 'host', room.id, 'e2eTrack001');
  await expect(playlistPanel(memberPage).getByText('E2E 테스트 트랙 01')).toBeVisible();

  await expect(memberPage.getByText('Host만 곡 이동을 제어할 수 있어요')).toBeVisible();
  await expect(memberPage.getByRole('button', { name: '다음 곡' })).toBeDisabled();
  await expect(memberPage.getByRole('button', { name: '이전 곡' })).toBeDisabled();
});
