import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScrollToBottomButton } from './ScrollToBottomButton';

describe('ScrollToBottomButton', () => {
  afterEach(() => {
    cleanup();
  });

  it('isVisible이 false면 렌더링하지 않는다', () => {
    const { container } = render(<ScrollToBottomButton isVisible={false} onClick={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('isVisible이 true면 버튼을 표시하고 클릭을 전달한다', () => {
    const onClick = vi.fn();
    render(<ScrollToBottomButton isVisible onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '맨 아래로 이동' }));

    expect(screen.getByText('맨 아래로')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
