import { describe, expect, it } from 'vitest';

import {
  captureScrollAnchor,
  isNearBottom,
  restoreScrollTopAfterPrepend,
  scrollToBottom,
} from './chatScrollUtils';

describe('chatScrollUtils', () => {
  it('captures the current scroll anchor', () => {
    expect(captureScrollAnchor({ scrollHeight: 500, scrollTop: 120 } as HTMLElement)).toEqual({
      scrollHeight: 500,
      scrollTop: 120,
    });
  });

  it('restores scrollTop after messages are prepended', () => {
    const container = { scrollHeight: 800, scrollTop: 100 } as HTMLElement;

    restoreScrollTopAfterPrepend(container, { scrollHeight: 500, scrollTop: 100 });

    expect(container.scrollTop).toBe(400);
  });

  it('detects when the container is near bottom within the threshold', () => {
    expect(
      isNearBottom({ clientHeight: 20, scrollHeight: 500, scrollTop: 480 } as HTMLElement),
    ).toBe(true);
  });

  it('detects when the container is away from bottom', () => {
    expect(
      isNearBottom({ clientHeight: 300, scrollHeight: 1000, scrollTop: 200 } as HTMLElement),
    ).toBe(false);
  });

  it('scrolls the container to the bottom', () => {
    const container = { scrollHeight: 900, scrollTop: 100 } as HTMLElement;

    scrollToBottom(container);

    expect(container.scrollTop).toBe(900);
  });
});
