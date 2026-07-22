import { act, cleanup, renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTallEnoughForInlineTabPanel } from './useTallEnoughForInlineTabPanel';

const setViewportHeight = (height: number) => {
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
};

const mountWithChromeBottom = (chromeBottom: number) => {
  const ref = createRef<HTMLDivElement>();
  const element = document.createElement('div');
  document.body.appendChild(element);
  element.getBoundingClientRect = () => ({ bottom: chromeBottom }) as DOMRect;
  ref.current = element;

  return { element, ref };
};

describe('useTallEnoughForInlineTabPanel', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('chrome 아래 남는 공간이 충분하면 true를 반환한다', () => {
    setViewportHeight(1000);
    // 남는 공간 = 1000 - 300(chromeBottom) - 112(footer) = 588 >= 280 + 24
    const { ref } = mountWithChromeBottom(300);

    const { result } = renderHook(() => useTallEnoughForInlineTabPanel(ref));

    expect(result.current).toEqual({ availableSpace: 588, isTallEnough: true });
  });

  it('chrome 아래 남는 공간이 부족하면 false를 반환한다', () => {
    setViewportHeight(700);
    // 남는 공간 = 700 - 400(chromeBottom) - 112(footer) = 188 < 280 + 24
    const { ref } = mountWithChromeBottom(400);

    const { result } = renderHook(() => useTallEnoughForInlineTabPanel(ref));

    expect(result.current).toEqual({ availableSpace: 188, isTallEnough: false });
  });

  it('resize 이벤트 발생 시 재측정한다', () => {
    setViewportHeight(700);
    const { ref, element } = mountWithChromeBottom(400);

    const { result } = renderHook(() => useTallEnoughForInlineTabPanel(ref));
    expect(result.current.isTallEnough).toBe(false);

    setViewportHeight(1000);
    element.getBoundingClientRect = () => ({ bottom: 300 }) as DOMRect;

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toEqual({ availableSpace: 588, isTallEnough: true });
  });

  it('한 번 tall이 되면 임계값(304) 아래로 살짝 줄어든 정도로는 narrow로 안 돌아간다(히스테리시스)', () => {
    setViewportHeight(1000);
    // 남는 공간 = 1000 - 598 - 112 = 290 < 304(진입 임계값) → 초기 false
    const { ref, element } = mountWithChromeBottom(598);

    const { result } = renderHook(() => useTallEnoughForInlineTabPanel(ref));
    expect(result.current.isTallEnough).toBe(false);

    // 남는 공간 = 1000 - 578 - 112 = 310 >= 304(진입 임계값) → true로 전환
    element.getBoundingClientRect = () => ({ bottom: 578 }) as DOMRect;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(result.current.isTallEnough).toBe(true);

    // 남는 공간 = 1000 - 618 - 112 = 270: 진입 임계값(304)보다는 작지만
    // 이탈 임계값(256)보다는 커서 true를 유지한다(모바일 주소창 접힘/펼침 같은 흔들림 방지).
    element.getBoundingClientRect = () => ({ bottom: 618 }) as DOMRect;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(result.current.isTallEnough).toBe(true);

    // 남는 공간 = 1000 - 638 - 112 = 250 < 256(이탈 임계값) → 그제서야 false로 전환
    element.getBoundingClientRect = () => ({ bottom: 638 }) as DOMRect;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(result.current.isTallEnough).toBe(false);
  });

  it('ref가 아직 비어있으면 false를 유지한다', () => {
    const emptyRef = createRef<HTMLDivElement>();
    const spy = vi.spyOn(window, 'addEventListener');

    const { result } = renderHook(() => useTallEnoughForInlineTabPanel(emptyRef));

    expect(result.current).toEqual({ availableSpace: 0, isTallEnough: false });
    expect(spy).not.toHaveBeenCalledWith('resize', expect.any(Function));
    spy.mockRestore();
  });
});
