// E-07 Room 종료.
//
// Host의 종료가 REST(DELETE /rooms/:id) → room:closed 브로드캐스트 →
// Member 화면 이탈까지 이어지는지 확인한다.
// "되돌리기 어려운 동작"이라 확인 다이얼로그를 거치는 것도 함께 본다(09-ui-ux-flow.md §7.3).
import { expect, test } from '../fixtures/test';
import { createRoom } from '../support/api';
import { resetRoomData } from '../support/db';
import { gotoRoom } from '../support/pages';
import { openRoomWithHostAndMember } from '../support/room-session';

test.beforeEach(async () => {
  await resetRoomData();
});

test('Host가 Room을 종료하면 Member도 안내를 받고 Home으로 나간다', async ({
  request,
  openPageAs,
}) => {
  const { hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  // exact가 없으면 확인 다이얼로그의 "Room 종료 확인" 버튼까지 함께 잡힌다.
  await hostPage.getByRole('button', { name: 'Room 종료', exact: true }).click();
  await expect(hostPage.getByText('Room을 종료할까요?')).toBeVisible();

  await hostPage.getByRole('button', { name: 'Room 종료 확인' }).click();

  // Member는 아무것도 누르지 않았는데 이탈해야 한다. room:closed 전파의 증거다.
  // 토스트 문구는 스크린리더용 live region에도 그려지므로 exact로 화면 요소만 집는다.
  await expect(memberPage.getByText('Room이 종료되었습니다.', { exact: true })).toBeVisible();
  await expect(memberPage).toHaveURL('/home');

  await expect(hostPage).toHaveURL('/home');
});

test('종료를 취소하면 Room에 그대로 남는다', async ({ request, openPageAs }) => {
  const { room, hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await hostPage.getByRole('button', { name: 'Room 종료', exact: true }).click();
  await hostPage.getByRole('button', { name: '취소' }).click();

  await expect(hostPage.getByText('Room을 종료할까요?')).toBeHidden();
  await expect(hostPage).toHaveURL(`/room/${room.id}`);
  await expect(memberPage).toHaveURL(`/room/${room.id}`);
  await expect(hostPage.getByText('2명 접속 중')).toBeVisible();
});

test('종료된 Room에는 다시 들어갈 수 없다', async ({ request, openPageAs }) => {
  const room = await createRoom(request, 'host', '곧 닫을 방');

  const hostPage = await openPageAs('host');
  await gotoRoom(hostPage, room.id);
  await expect(hostPage.getByText('1명 접속 중')).toBeVisible();

  await hostPage.getByRole('button', { name: 'Room 종료', exact: true }).click();
  await hostPage.getByRole('button', { name: 'Room 종료 확인' }).click();
  await expect(hostPage).toHaveURL('/home');

  // 서버가 ROOM_CLOSED로 거절하므로 Room 화면으로 넘어가지 못한다.
  const memberPage = await openPageAs('member');
  await memberPage.goto(`/room/join?code=${room.inviteCode}`);

  await expect(memberPage.getByText('이미 종료된 방이에요')).toBeVisible();
  await expect(memberPage).toHaveURL(/\/room\/join/);
});
