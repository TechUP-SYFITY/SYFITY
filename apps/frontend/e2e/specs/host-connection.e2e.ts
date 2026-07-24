// Host의 Socket이 끊기면 서버가 유예 타이머를 걸고 room:host-disconnected를 방송한다.
// Member 화면은 재접속 대기 안내를 띄우고, Host가 유예 시간 안에 돌아오면
// (room:host-reconnected) 안내가 걷힌다. 이 전이는 실제 Socket 연결의 생사에 달려 있어
// 하위 계층 테스트로는 재현되지 않고 E2E로만 확인된다.
import { expect, test } from '../fixtures/test';
import { resetRoomData } from '../support/db';
import { gotoRoom } from '../support/pages';
import { openRoomWithHostAndMember } from '../support/room-session';

const HOST_DISCONNECTED_NOTICE = '호스트 연결이 끊겼습니다. 재접속을 기다리는 중...';

test.beforeEach(async () => {
  await resetRoomData();
});

test('Host 연결이 끊기면 Member에게 재접속 대기 안내가 뜬다', async ({ request, openPageAs }) => {
  const { hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  // 컨텍스트를 닫아야 Socket이 실제로 끊긴다. Member는 아무것도 하지 않았는데 안내를 받아야 한다.
  await hostPage.context().close();

  await expect(memberPage.getByText(HOST_DISCONNECTED_NOTICE)).toBeVisible();
});

test('Host가 유예 시간 안에 돌아오면 안내가 사라진다', async ({ request, openPageAs }) => {
  const { room, hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await hostPage.context().close();
  await expect(memberPage.getByText(HOST_DISCONNECTED_NOTICE)).toBeVisible();

  // Host가 다시 들어오면 방은 유지되고 안내만 걷힌다.
  const rejoinedHost = await openPageAs('host');
  await gotoRoom(rejoinedHost, room.id);

  await expect(memberPage.getByText(HOST_DISCONNECTED_NOTICE)).toBeHidden();
});
