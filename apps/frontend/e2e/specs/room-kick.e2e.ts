// 추방은 Room에서 내보내는 데서 끝나지 않고 재입장까지 막는다. 그 상태 전이는
// Socket(room:kicked) → 대상 화면 이탈 → REST(POST /room-memberships) 거절로 이어지므로
// 브라우저 두 개와 실제 서버가 있어야 확인할 수 있다.
import { expect, test } from '../fixtures/test';
import { resetRoomData } from '../support/db';
import { TEST_USERS } from '../support/env';
import { memberPanel, openRoomWithHostAndMember } from '../support/room-session';

const MEMBER = TEST_USERS.member.nickname;

test.beforeEach(async () => {
  await resetRoomData();
});

/** Host 화면에서 Member를 추방한다. 확인 다이얼로그까지 거친다. */
const kickMember = async (
  hostPage: Awaited<ReturnType<typeof openRoomWithHostAndMember>>['hostPage'],
) => {
  await memberPanel(hostPage)
    .getByRole('button', { name: `${MEMBER} 멤버 관리` })
    .click();
  await hostPage.getByRole('menuitem', { name: '멤버 추방' }).click();

  await expect(hostPage.getByText(`${MEMBER}님을 추방할까요?`)).toBeVisible();
  await hostPage.getByRole('button', { name: '추방하기' }).click();
};

test('Host가 추방하면 Member는 Room에서 나가고 목록에서 사라진다', async ({
  request,
  openPageAs,
}) => {
  const { room, hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await kickMember(hostPage);

  // 추방된 Member는 아무것도 누르지 않았는데 이탈해야 한다. room:kicked 전파의 증거다.
  await expect(memberPage).toHaveURL('/home');

  await expect(hostPage.getByText('1명 접속 중')).toBeVisible();
  await expect(memberPanel(hostPage).getByText(MEMBER)).toBeHidden();
  await expect(hostPage).toHaveURL(`/room/${room.id}`);
});

test('추방된 Member는 초대 코드로 다시 들어올 수 없다', async ({ request, openPageAs }) => {
  const { room, hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await kickMember(hostPage);
  await expect(memberPage).toHaveURL('/home');

  // 나가기(E-12)와 달리 재입장이 막힌다. 서버가 ROOM_MEMBER_KICKED로 거절하고,
  // 화면은 closed·inactive와 구분되는 추방 전용 안내를 보여준다(09-ui-ux-flow.md §5.2).
  await memberPage.goto(`/room/join?code=${room.inviteCode}`);

  await expect(memberPage.getByText('이 Room에서 추방되었어요')).toBeVisible();
  await expect(memberPage.getByText('Host가 다시 허용하기 전에는 입장할 수 없어요.')).toBeVisible();
  await expect(memberPage).toHaveURL(/\/room\/join/);
});

test('Host가 추방을 해제하면 Member가 다시 들어올 수 있다', async ({ request, openPageAs }) => {
  const { room, hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await kickMember(hostPage);
  await expect(memberPage).toHaveURL('/home');

  await memberPanel(hostPage).getByRole('button', { name: '추방 관리' }).click();
  await hostPage.getByRole('button', { name: `${MEMBER} 추방 해제` }).click();
  await expect(hostPage.getByText(`${MEMBER}님의 추방을 해제할까요?`)).toBeVisible();
  await hostPage.getByRole('button', { name: '해제하기' }).click();

  // 해제만으로 자동 입장되지는 않는다. 접속자 수는 그대로여야 한다.
  await expect(hostPage.getByText('1명 접속 중')).toBeVisible();

  await memberPage.goto(`/room/join?code=${room.inviteCode}`);
  await expect(memberPage).toHaveURL(/\/room\/[0-9a-f-]{36}$/);
  await expect(hostPage.getByText('2명 접속 중')).toBeVisible();
});

test('Member에게는 멤버 관리 수단이 없다', async ({ request, openPageAs }) => {
  const { hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  const hostName = TEST_USERS.host.nickname;

  // Host 화면에는 있다는 것을 함께 확인해, 로케이터가 틀려서 통과하는 상황을 막는다.
  await expect(
    memberPanel(hostPage).getByRole('button', { name: `${MEMBER} 멤버 관리` }),
  ).toBeVisible();

  await expect(memberPanel(memberPage).getByRole('button', { name: '추방 관리' })).toHaveCount(0);
  await expect(
    memberPanel(memberPage).getByRole('button', { name: `${hostName} 멤버 관리` }),
  ).toHaveCount(0);
});
