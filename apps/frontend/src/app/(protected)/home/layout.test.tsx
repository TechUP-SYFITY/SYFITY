import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/components/UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

import HomeLayout from './layout';

describe('HomeLayout', () => {
  it('최소 뷰포트 높이를 채우고 Footer에서 약관과 개인정보처리방침을 제공한다', () => {
    const { container } = render(
      <HomeLayout>
        <div>Home content</div>
      </HomeLayout>,
    );

    expect(container.firstElementChild).toHaveClass('min-h-dvh');
    expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });
});
