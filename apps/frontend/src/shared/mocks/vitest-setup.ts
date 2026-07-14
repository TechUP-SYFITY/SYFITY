import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './server';

// jsdom은 window.matchMedia를 구현하지 않아 useMediaQuery 등을 쓰는 컴포넌트가
// 테스트에서 바로 에러를 던진다. 기본값(항상 매칭 안 됨)으로 폴리필한다.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
