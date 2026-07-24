// E-05 채팅 송수신.
//
// chat:send → 서버 저장 → chat:received 브로드캐스트가 상대 화면까지 닿는지 확인한다.
// 서버 단위 테스트는 broadcastToRoom이 "호출됐는지"만 보고, 컴포넌트 테스트는 props로 받은
// 메시지를 그릴 뿐이다. 실제로 상대 브라우저에 도착하는지는 여기서만 검증된다.
import { expect, test } from '../fixtures/test';
import { resetRoomData } from '../support/db';
import { TEST_USERS } from '../support/env';
import { chatPanel, openRoomWithHostAndMember, sendChatMessage } from '../support/room-session';

test.beforeEach(async () => {
  await resetRoomData();
});

test('Member가 보낸 메시지가 Host 화면에 닉네임과 함께 도착한다', async ({
  request,
  openPageAs,
}) => {
  const { hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await sendChatMessage(memberPage, '이 곡 좋네요');

  // 닉네임만 따로 찾으면 입장 시스템 메시지("...님이 입장했습니다.")까지 걸린다.
  // 메시지를 감싼 가장 안쪽 블록을 잡아 "이 메시지의 작성자가 Member인지"를 본다.
  const hostChat = chatPanel(hostPage);
  const messageBlock = hostChat.locator('div').filter({ hasText: '이 곡 좋네요' }).last();
  await expect(messageBlock).toBeVisible();
  await expect(messageBlock).toContainText(TEST_USERS.member.nickname);

  // 보낸 사람 화면에서는 낙관적 메시지(temp id)와 브로드캐스트된 실제 메시지가
  // 잠깐 함께 존재할 수 있다. ack가 도착하면 chatStore가 temp를 지운다.
  // 따라서 "보이는지"가 아니라 "최종적으로 하나로 정리되는지"를 단언한다.
  // 이렇게 두면 중복이 사라지지 않는 진짜 회귀는 여전히 잡힌다.
  await expect(chatPanel(memberPage).getByText('이 곡 좋네요')).toHaveCount(1);
});

test('양방향으로 주고받은 메시지가 양쪽에서 같은 순서로 보인다', async ({
  request,
  openPageAs,
}) => {
  const { hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  // 순서를 검증하려면 전송 순서가 확정되어야 한다.
  // 다음 메시지를 보내기 전에 상대 화면 도착까지 기다려 경쟁을 없앤다.
  const conversation = [
    { page: memberPage, text: '첫 번째' },
    { page: hostPage, text: '두 번째' },
    { page: memberPage, text: '세 번째' },
  ];

  for (const { page, text } of conversation) {
    await sendChatMessage(page, text);
    // 보낸 쪽에서 낙관적 메시지와 브로드캐스트가 겹치는 순간을 지나 정리될 때까지 기다린다.
    await expect(chatPanel(hostPage).getByText(text)).toHaveCount(1);
    await expect(chatPanel(memberPage).getByText(text)).toHaveCount(1);
  }

  for (const page of [hostPage, memberPage]) {
    const messages = chatPanel(page).getByText(/^(첫 번째|두 번째|세 번째)$/);
    await expect(messages).toHaveText(['첫 번째', '두 번째', '세 번째']);
  }
});

test('앞뒤 공백을 걷어낸 메시지가 상대에게 전달된다', async ({ request, openPageAs }) => {
  const { hostPage, memberPage } = await openRoomWithHostAndMember({ request, openPageAs });

  await sendChatMessage(memberPage, '   앞뒤 공백   ');
  await expect(chatPanel(memberPage).getByText('앞뒤 공백', { exact: true })).toHaveCount(1);

  // exact 매칭이므로 공백이 남아 있으면 실패한다.
  // 공백만 있는 메시지의 거부는 ChatInputForm과 chat.service 단위 테스트가 담당한다
  // (전송 버튼이 disabled되는 게 아니라 제출 핸들러가 조기 return하는 구조라 UI로는 관찰되지 않는다).
  await expect(chatPanel(hostPage).getByText('앞뒤 공백', { exact: true })).toBeVisible();
});
