import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchDemoPage } from './SearchDemoPage';
import { YoutubeSearchPanel } from './YoutubeSearchPanel';

vi.mock('./YoutubeSearchPanel', () => ({
  YoutubeSearchPanel: vi.fn(({ open, roomName, initialQuery, onClose }) => (
    <div
      data-testid="youtube-search-panel"
      data-open={String(open)}
      data-room-name={roomName}
      data-initial-query={initialQuery ?? ''}
    >
      <button type="button" onClick={onClose}>
        close search
      </button>
    </div>
  )),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SearchDemoPage', () => {
  it('renders the API-backed YouTube search panel without seeded mock results', () => {
    render(<SearchDemoPage />);

    expect(screen.getByTestId('youtube-search-panel')).toBeTruthy();
    expect(YoutubeSearchPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        roomName: 'Chill Night',
      }),
      undefined,
    );
    expect(screen.getByTestId('youtube-search-panel').getAttribute('data-initial-query')).toBe('');
    expect(screen.queryByText('Yellow')).toBeNull();
    expect(screen.queryByText('검색 결과 5개')).toBeNull();
  });

  it('reopens the API-backed search panel from the demo control', () => {
    render(<SearchDemoPage />);

    fireEvent.click(screen.getByText('close search'));
    expect(screen.getByTestId('youtube-search-panel').getAttribute('data-open')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: '검색 패널 열기' }));

    expect(screen.getByTestId('youtube-search-panel').getAttribute('data-open')).toBe('true');
  });
});
