// E-09 초대 코드 오류 흐름.
//
// 정상 입장은 E-03, 종료된 Room 재입장 거부는 E-07(room-close.e2e.ts)이 이미 덮는다.
// 여기서는 잘못된 코드와 입력 검증만 다룬다.
// 추방된 사용자의 재입장 거부는 Frontend에 추방 UI가 아직 없어 제외한다(§9 참고).
import { expect, test } from '../fixtures/test';
import { resetRoomData } from '../support/db';
import { storageStatePath } from '../support/env';

test.use({ storageState: storageStatePath('member') });

test.beforeEach(async () => {
  await resetRoomData();
});

test('존재하지 않는 초대 코드는 인라인 오류로 알린다', async ({ page }) => {
  // 초대 코드는 randomBytes(3).toString('hex').toUpperCase() = 6자리 16진수다.
  // 아래 값은 형식은 맞지만 어떤 Room에도 없다.
  await page.goto('/room/join?code=ZZZZZZ');

  await expect(page.getByText('유효하지 않은 초대 코드예요. 다시 확인해주세요.')).toBeVisible();

  // Room으로 넘어가지 않고 다시 시도할 수 있어야 한다.
  await expect(page).toHaveURL(/\/room\/join/);
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

test('허용되지 않는 문자는 입력 단계에서 걸러진다', async ({ page }) => {
  await page.goto('/room/join');

  // getByLabel은 다이얼로그 제목("초대 코드로 입장")까지 부분 일치로 잡는다.
  const input = page.getByRole('textbox', { name: '초대 코드' });
  await expect(input).toBeEditable();

  // sanitizeInviteCode가 소문자를 대문자로 올리고 기호를 버린다.
  // 입력값은 6자 이내여야 한다. maxlength="6"이 sanitize보다 먼저 잘라내서
  // 7자를 넣으면 기호가 제거되기 전에 끝 글자가 사라진다.
  await input.fill('ab!12');

  await expect(input).toHaveValue('AB12');
});

test('코드를 비우면 입장할 수 없다', async ({ page }) => {
  await page.goto('/room/join');

  await expect(page.getByRole('textbox', { name: '초대 코드' })).toBeEditable();
  await expect(page.getByRole('button', { name: '입장하기' })).toBeDisabled();
});
