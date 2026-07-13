import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatHistoryStatus } from './ChatHistoryStatus';

describe('ChatHistoryStatus', () => {
  afterEach(() => {
    cleanup();
  });

  it('loading 상태를 표시한다', () => {
    render(<ChatHistoryStatus isLoading isError={false} onRetry={vi.fn()} />);

    expect(screen.getByText('이전 메시지를 불러오는 중...')).toBeInTheDocument();
  });

  it('error 상태와 재시도 버튼을 표시한다', () => {
    const onRetry = vi.fn();
    render(<ChatHistoryStatus isLoading={false} isError onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /다시 시도/ }));

    expect(screen.getByText('이전 메시지를 불러오지 못했어요.')).toBeInTheDocument();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('loading과 error가 아니면 아무 것도 렌더링하지 않는다', () => {
    const { container } = render(
      <ChatHistoryStatus isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
