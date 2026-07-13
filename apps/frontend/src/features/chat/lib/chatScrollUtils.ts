import { CHAT_NEAR_BOTTOM_THRESHOLD_PX } from '../constants/chatConstants';

export interface ScrollAnchor {
  scrollTop: number;
  scrollHeight: number;
}

export function captureScrollAnchor(
  container: Pick<HTMLElement, 'scrollTop' | 'scrollHeight'>,
): ScrollAnchor {
  return {
    scrollHeight: container.scrollHeight,
    scrollTop: container.scrollTop,
  };
}

export function restoreScrollTopAfterPrepend(
  container: Pick<HTMLElement, 'scrollHeight'> & { scrollTop: number },
  anchor: ScrollAnchor,
) {
  container.scrollTop = anchor.scrollTop + (container.scrollHeight - anchor.scrollHeight);
}

export function isNearBottom(
  container: Pick<HTMLElement, 'clientHeight' | 'scrollHeight' | 'scrollTop'>,
  thresholdPx: number = CHAT_NEAR_BOTTOM_THRESHOLD_PX,
) {
  return container.scrollHeight - container.scrollTop - container.clientHeight <= thresholdPx;
}

export function scrollToBottom(
  container: Pick<HTMLElement, 'scrollHeight'> & { scrollTop: number },
) {
  container.scrollTop = container.scrollHeight;
}
