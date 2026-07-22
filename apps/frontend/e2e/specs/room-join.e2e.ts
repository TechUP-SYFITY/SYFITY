// E-03 초대 코드로 참여.
//
// 이 시나리오부터 Socket 실시간 전파가 검증 대상이 된다.
// Member의 입장이 Host 화면에 반영되는지는 브라우저가 둘 다 떠 있어야만 확인할 수 있고,
// 서비스 테스트(broadcastToRoom 호출 여부)나 컴포넌트 테스트로는 잡히지 않는 영역이다.
import { expect, test } from '../fixtures/test';
import { createRoom } from '../support/api';
import { resetRoomData } from '../support/db';
import { TEST_USERS } from '../support/env';
import { gotoRoom, joinRoomByInviteLink } from '../support/pages';
import { memberPanel } from '../support/room-session';

test.beforeEach(async () => {
  await resetRoomData();
});

test('Member가 초대 코드로 입장하면 양쪽 화면에 실시간 반영된다', async ({
  request,
  openPageAs,
}) => {
  const room = await createRoom(request, 'host', '함께 듣는 방');

  const hostPage = await openPageAs('host');
  await gotoRoom(hostPage, room.id);

  // Host의 Socket이 붙어 room에 join된 뒤에 Member를 입장시켜야
  // Host가 presence·시스템 메시지 브로드캐스트를 받을 수 있다.
  await expect(hostPage.getByText('1명 접속 중')).toBeVisible();

  const memberPage = await openPageAs('member');
  await joinRoomByInviteLink(memberPage, room.inviteCode);

  const hostName = TEST_USERS.host.nickname;
  const memberName = TEST_USERS.member.nickname;

  // Member 화면: 입장 직후 room:joined 스냅샷으로 두 명이 모두 보인다.
  await expect(memberPage.getByText('2명 접속 중')).toBeVisible();
  await expect(memberPage.getByRole('heading', { level: 1, name: room.name })).toBeVisible();

  // Host 화면: 다시 로드하지 않았는데도 바뀌어야 한다. 이게 Socket 전파의 증거다.
  await expect(hostPage.getByText('2명 접속 중')).toBeVisible();

  // Room의 사이드 패널(멤버·재생목록·채팅)은 모두 이름 없는 complementary라
  // role 이름으로는 구분되지 않는다. 내용으로 좁힌다.
  for (const page of [hostPage, memberPage]) {
    await expect(memberPanel(page).getByText(hostName)).toBeVisible();
    await expect(memberPanel(page).getByText(memberName)).toBeVisible();
  }

  // 시스템 메시지는 도달 경로가 둘이라 각각 확인한다.
  //  - Host: 이미 Room에 있었으므로 chat:system 브로드캐스트로 받는다.
  //  - Member: 자기보다 먼저 쌓인 메시지를 room:joined 스냅샷으로 받는다.
  //
  // Member가 "자기 자신의" 입장 메시지를 보는지는 단언하지 않는다.
  // room:joined 스냅샷 조회와 chat:system 브로드캐스트가 서로 경쟁해 실행마다 달라진다
  // (11-e2e-test-plan.md §16.6).
  await expect(hostPage.getByText(`${memberName}님이 입장했습니다.`)).toBeVisible();
  await expect(memberPage.getByText(`${hostName}님이 입장했습니다.`)).toBeVisible();
});
