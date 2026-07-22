import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Checkbox } from './Checkbox';

afterEach(cleanup);

describe('Checkbox', () => {
  it('선택 상태를 접근 가능한 checkbox 역할로 표시한다', () => {
    render(<Checkbox aria-label="약관 동의" checked />);

    expect(screen.getByRole('checkbox', { name: '약관 동의' })).toBeChecked();
  });

  it('상태 변경을 onCheckedChange으로 전달한다', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="약관 동의" onCheckedChange={onCheckedChange} />);

    fireEvent.click(screen.getByRole('checkbox', { name: '약관 동의' }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
