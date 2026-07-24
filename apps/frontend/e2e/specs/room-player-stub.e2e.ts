// 5단계 검증: Room 화면이 외부 의존 없이 뜨고, 플레이어 스텁이 실제 컴포넌트에 붙는가.
//
// 재생 동기화 시나리오(E-06) 자체는 6단계에서 다룬다. 여기서는 그 시나리오들이 딛고 설
// 토대만 확인한다. 토대가 흔들리면 이후 실패가 전부 "플레이어 때문인지 동기화 때문인지"
// 구분되지 않는다.
import { expect, test } from '../fixtures/test';
import { addPlaylistItem, createRoom } from '../support/api';
import { storageStatePath } from '../support/env';

test.use({ storageState: storageStatePath('host') });

test('Room 진입 시 외부 네트워크 요청이 발생하지 않는다', async ({
  page,
  request,
  externalRequests,
}) => {
  const room = await createRoom(request, 'host', '외부요청 검증 Room');

  await page.goto(`/room/${room.id}`);

  // 플레이어 요소만 확인하면 화면 나머지가 오류 상태여도 통과한다.
  // Room 이름이 보이는지까지 봐야 "정상 렌더"라고 말할 수 있다.
  await expect(page.getByText('외부요청 검증 Room')).toBeVisible();
  await expect(page.locator('[data-e2e-youtube-player]')).toBeAttached();

  expect(externalRequests).toEqual([]);
});

test('플레이어 스텁이 실제 컴포넌트의 onReady까지 연결된다', async ({ page, request }) => {
  const room = await createRoom(request, 'host');

  await page.goto(`/room/${room.id}`);
  await expect(page.locator('[data-e2e-youtube-player]')).toBeAttached();

  // snapshot을 읽을 수 있다 = new window.YT.Player가 실행되고 인스턴스가 등록됐다는 뜻.
  const snapshot = await page.evaluate(() => window.__e2eYouTube?.snapshot());

  expect(snapshot).toMatchObject({ isDestroyed: false, isMuted: false });
});

test('YouTube IFrame API 스크립트를 주입하지 않는다', async ({ page, request }) => {
  const room = await createRoom(request, 'host');
  await addPlaylistItem(request, 'host', room.id, 'e2eTrack001');

  await page.goto(`/room/${room.id}`);
  await expect(page.locator('[data-e2e-youtube-player]')).toBeAttached();

  // 스텁의 핵심 동작. loadYouTubeApi()가 window.YT를 먼저 발견하면 script 태그를 만들지 않는다.
  // route 차단에만 기대면 "요청은 막았지만 실제 플레이어를 기다리다 타임아웃"이 될 수 있다.
  const injectedScripts = await page.locator('script[src*="iframe_api"]').count();

  expect(injectedScripts).toBe(0);
});

// 현재 곡이 플레이어까지 전달되는 흐름(서버 재생 세션 → Socket → 컴포넌트)은
// 곡 선택·재생 명령이 필요하므로 6단계 E-06에서 검증한다.
// 곡을 추가하는 것만으로는 재생 세션의 현재 곡이 정해지지 않는다.
