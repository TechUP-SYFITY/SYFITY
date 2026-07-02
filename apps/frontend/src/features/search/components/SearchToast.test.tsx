import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchToast } from './SearchToast';

afterEach(cleanup);

describe('SearchToast', () => {
  it('renders the Figma error toast style and forwards dismiss clicks', () => {
    const handleDismiss = vi.fn();

    render(
      <SearchToast
        toast={{
          type: 'error',
          message: '유효하지 않은 링크예요. YouTube 링크를 붙여넣어 주세요.',
        }}
        onDismiss={handleDismiss}
      />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(
      screen.getByText('유효하지 않은 링크예요. YouTube 링크를 붙여넣어 주세요.'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '토스트 닫기' }));

    expect(handleDismiss).toHaveBeenCalledOnce();
  });

  it('renders the Figma success toast style', () => {
    render(
      <SearchToast
        toast={{
          type: 'success',
          message: '플레이리스트에 추가했어요 🎵',
        }}
        onDismiss={() => undefined}
      />,
    );

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('플레이리스트에 추가했어요 🎵')).toBeTruthy();
  });
});
