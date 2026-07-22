import '@testing-library/jest-dom/vitest';

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MemberAvatar } from './MemberAvatar';

afterEach(cleanup);

describe('MemberAvatar', () => {
  it('상태 표시를 숨겨도 아바타는 선명하게 유지한다', () => {
    const { container } = render(<MemberAvatar label="지민" showStatus={false} />);

    expect(container.querySelector('.opacity-45')).not.toBeInTheDocument();
    expect(container.querySelector('.bg-primary')).not.toBeInTheDocument();
  });
});
