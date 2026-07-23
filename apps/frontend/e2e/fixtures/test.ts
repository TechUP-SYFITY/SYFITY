// 모든 E2E 스펙은 '@playwright/test'가 아니라 이 모듈에서 test를 가져온다.
// 외부 의존 차단을 각 스펙이 기억해서 처리해야 한다면 언젠가 빠뜨리게 되므로,
// 진입점을 하나로 두고 기본값으로 강제한다.
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

import { installYouTubePlayerStub } from './youtube-player';
import { BACKEND_URL, FRONTEND_URL, storageStatePath, type TestUserKey } from '../support/env';

interface Fixtures {
  /**
   * 로컬 스택(FE·BE) 밖으로 나간 요청 목록.
   * E2E는 외부 네트워크에 의존하지 않아야 하므로, 비어 있는지 단언하는 데 쓴다.
   */
  externalRequests: string[];

  /**
   * 지정한 사용자로 로그인된 새 페이지를 연다.
   *
   * Host와 Member의 화면을 동시에 확인하는 시나리오(E-03~E-07)에 쓴다.
   * 한 컨텍스트에서 사용자를 바꿀 수 없으므로 사용자마다 별도 BrowserContext가 필요하고,
   * 기본 `page` 픽스처와 같은 외부 의존 차단을 여기서도 똑같이 적용한다.
   */
  openPageAs: (user: TestUserKey) => Promise<Page>;
}

const isLocalRequest = (url: string) =>
  url.startsWith(FRONTEND_URL) ||
  url.startsWith(BACKEND_URL) ||
  url.startsWith('data:') ||
  url.startsWith('blob:') ||
  url.startsWith('about:');

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await installYouTubePlayerStub(page);
    await use(page);
  },

  externalRequests: async ({ page }, use) => {
    const requests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (!isLocalRequest(url)) {
        requests.push(url);
      }
    });

    await use(requests);
  },

  openPageAs: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];

    await use(async (user) => {
      const context = await browser.newContext({ storageState: storageStatePath(user) });
      contexts.push(context);

      const page = await context.newPage();
      await installYouTubePlayerStub(page);
      return page;
    });

    // 컨텍스트를 닫아야 Socket 연결이 끊긴다. 남겨 두면 다음 테스트의 접속자 수가 어긋난다.
    await Promise.all(contexts.map((context) => context.close()));
  },
});

export { expect };
