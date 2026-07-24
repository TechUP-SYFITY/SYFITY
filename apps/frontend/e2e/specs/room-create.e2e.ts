// E-02 Room 생성 → 입장.
// Home에서 방을 만들고 초대 코드를 받아 Room에 들어가는, 서비스의 첫 관문.
// 이후 모든 Room 시나리오(E-03~E-07)가 이 흐름으로 사전 조건을 만든다.
import { expect, test } from '../fixtures/test';
import { resetRoomData } from '../support/db';
import { storageStatePath } from '../support/env';
import { gotoHome } from '../support/pages';

test.use({ storageState: storageStatePath('host') });

// Room 데이터는 spec 사이에 남으면 Home의 "최근 참여한 방" 목록이 달라져
// 화면 구성이 실행 순서에 따라 흔들린다.
test.beforeEach(async () => {
  await resetRoomData();
});

test('Home에서 방을 만들고 초대 코드를 받아 입장한다', async ({ page }) => {
  const roomName = '재즈의 밤';

  // gotoHome은 하이드레이션 완료까지 기다린다. 이걸 빼면 클릭이 조용히 무시된다(§16.5).
  await gotoHome(page, 'host');

  // 헤더와 "최근 참여한 방" 빈 상태 양쪽에 같은 버튼이 있다. 둘 다 같은 핸들러를 부르므로
  // 사용자 관점에서는 어느 쪽을 눌러도 동일하다.
  await page.getByRole('button', { name: '방 만들기' }).first().click();

  await page.getByLabel('방 이름').fill(roomName);
  await page.getByRole('button', { name: '만들기' }).click();

  // 초대 다이얼로그는 모바일용·데스크톱용 마크업을 둘 다 DOM에 두고 CSS로 감춘다.
  // 로케이터가 2개를 잡아 strict mode 위반이 나므로 보이는 것만 고른다.
  const visible = { visible: true };
  await expect(page.getByText('방이 만들어졌어요!').filter(visible)).toBeVisible();

  // 사용자가 실제로 공유하는 건 초대 링크다. 링크에 코드가 박혀 있는지로 확인한다.
  // (코드 문자열 자체를 DOM 위치로 찾으면 마크업이 조금만 바뀌어도 깨진다)
  await expect(page.getByText(/\/room\/join\?code=\w+/).filter(visible)).toBeVisible();

  await page.getByRole('button', { name: '방으로 입장하기' }).filter(visible).click();

  await expect(page).toHaveURL(/\/room\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: roomName })).toBeVisible();

  // 생성자는 Host다. Host에게만 "Room 종료"가 보이고 Member에게는 "나가기"가 보인다.
  await expect(page.getByRole('button', { name: 'Room 종료' })).toBeVisible();
  await expect(page.getByRole('button', { name: '나가기' })).toBeHidden();

  await expect(page.getByText('1명 접속 중')).toBeVisible();
});
