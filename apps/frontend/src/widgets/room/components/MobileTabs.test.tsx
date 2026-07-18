// Radix Tabs는 controlled value가 그대로면 onValueChange를 호출하지 않는다.
// 이미 활성화된 탭을 다시 누르는 케이스(닫기 토글)가 여전히 동작하는지, 그리고
// 다른 탭으로 전환할 때 onChange가 중복 호출되지 않는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MobileTabs } from './MobileTabs';

// 실제 탭/클릭은 mousedown → click 순으로 이벤트가 발생하고, Radix Tabs의 값 변경은
// onMouseDown에서 일어난다. fireEvent.click만 쏘면 mousedown이 안 나가 그 경로를
// 놓치므로, 실제 브라우저 동작과 동일하게 두 이벤트를 순서대로 발생시킨다.
const tap = (element: HTMLElement) => {
  fireEvent.mouseDown(element, { button: 0 });
  fireEvent.click(element);
};

describe('MobileTabs', () => {
  afterEach(cleanup);

  it('비활성 탭을 누르면 onChange가 정확히 한 번, 그 탭 id로 호출된다', () => {
    const onChange = vi.fn();
    render(<MobileTabs activeTab="playlist" onChange={onChange} />);

    tap(screen.getByRole('tab', { name: /채팅/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('chat');
  });

  it('이미 활성화된 탭을 다시 누르면 onChange가 같은 탭 id로 호출된다', () => {
    const onChange = vi.fn();
    render(<MobileTabs activeTab="chat" onChange={onChange} />);

    tap(screen.getByRole('tab', { name: /채팅/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('chat');
  });

  it('activeTab이 null이면(아무 탭도 열려있지 않음) 어떤 탭도 active 상태가 아니다', () => {
    render(<MobileTabs activeTab={null} onChange={vi.fn()} />);

    for (const name of [/재생목록/, /멤버/, /채팅/]) {
      expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'false');
    }
  });
});
