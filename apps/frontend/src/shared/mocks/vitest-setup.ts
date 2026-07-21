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

// jsdom은 ResizeObserver를 구현하지 않는다. jsdom은 실제 레이아웃 계산을 하지 않으므로
// 콜백이 실제로 발화할 필요는 없고, observe/disconnect 호출이 에러 없이 통과하기만
// 하면 되는 무동작 스텁으로 폴리필한다.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom은 Pointer Capture와 scrollIntoView를 구현하지 않는다. Radix(DropdownMenu 등)는
// 열림/포커스 과정에서 이들을 호출하므로, 무동작 스텁으로 폴리필해 테스트에서 에러가 나지 않게 한다.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
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
