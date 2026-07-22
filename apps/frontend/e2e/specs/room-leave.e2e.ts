// E-12 Member 나가기.
//
// Host의 Room 종료(E-07)와 달리 Member의 퇴장은 Room을 닫지 않는다.
// 나간 사람만 빠지고 남은 사람은 그대로 있어야 한다는 게 핵심이다.
import { expect, test } from '../fixtures/test';
import { resetRoomData } from '../support/db';
import { TEST_USERS } from '../support/env';
import { chatPanel, memberPanel, openRoomWithHostAndMember } from '../support/room-session';

test.beforeEach(async () => {
  await resetRoomData();
});

test('Member가 나가면 Host 화면에 퇴장 메시지가 남고 Room은 유지된다', async ({
  request,
  openPageAs,
}) => {
  const { room, hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  const memberName = TEST_USERS.member.nickname;

  // Member에게는 확인 다이얼로그 없이 바로 나가는 "나가기" 버튼이 보인다(Host는 "Room 종료").
  await memberPage.getByRole('button', { name: '나가기' }).click();
  await expect(memberPage).toHaveURL('/home');

  // Host는 아무것도 누르지 않았는데 참여자 수와 채팅이 바뀌어야 한다.
  await expect(hostPage.getByText('1명 접속 중')).toBeVisible();
  await expect(chatPanel(hostPage).getByText(`${memberName}님이 퇴장했습니다.`)).toBeVisible();
  await expect(memberPanel(hostPage).getByText(memberName)).toBeHidden();

  // Room 자체는 살아 있다. Host는 그대로 남는다.
  await expect(hostPage).toHaveURL(`/room/${room.id}`);
  await expect(hostPage.getByRole('button', { name: 'Room 종료', exact: true })).toBeVisible();
});

test('나간 Member는 같은 Room에 다시 들어올 수 있다', async ({ request, openPageAs }) => {
  const { room, hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await memberPage.getByRole('button', { name: '나가기' }).click();
  await expect(hostPage.getByText('1명 접속 중')).toBeVisible();

  // 퇴장은 추방과 다르다. 초대 코드로 재입장할 수 있어야 한다.
  await memberPage.goto(`/room/join?code=${room.inviteCode}`);

  await expect(memberPage).toHaveURL(/\/room\/[0-9a-f-]{36}$/);
  await expect(hostPage.getByText('2명 접속 중')).toBeVisible();
});
