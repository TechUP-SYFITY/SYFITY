import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/lib/api/apiClient';

import { YoutubeSearchPanel } from './YoutubeSearchPanel';
import { MOCK_SEARCH_RESULTS } from '../data/mockSearchResults';
import { useYoutubeSearch } from '../hooks/useYoutubeSearch';

vi.mock('../hooks/useYoutubeSearch', () => ({
  useYoutubeSearch: vi.fn(),
}));

const mockUseYoutubeSearch = vi.mocked(useYoutubeSearch);

const idleSearchQuery = {
  data: undefined,
  isFetching: false,
  isError: false,
  error: null,
} as ReturnType<typeof useYoutubeSearch>;

describe('YoutubeSearchPanel', () => {
  beforeEach(() => {
    mockUseYoutubeSearch.mockReturnValue(idleSearchQuery);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the Figma error toast for non-YouTube links and skips searching that URL', () => {
    render(
      <YoutubeSearchPanel
        open
        roomName="Chill Night"
        onClose={() => undefined}
        onAdd={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: '곡 검색' }), {
      target: { value: 'https://example.com/not-youtube' },
    });

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(
      screen.getByText('유효하지 않은 링크예요. YouTube 링크를 붙여넣어 주세요.'),
    ).toBeTruthy();
    expect(mockUseYoutubeSearch).toHaveBeenLastCalledWith('');
  });

  it('shows the Figma success toast after adding a YouTube search result', () => {
    const handleAdd = vi.fn();

    mockUseYoutubeSearch.mockReturnValue({
      ...idleSearchQuery,
      data: [MOCK_SEARCH_RESULTS[0]],
    } as ReturnType<typeof useYoutubeSearch>);

    render(
      <YoutubeSearchPanel
        open
        roomName="Chill Night"
        onClose={() => undefined}
        onAdd={handleAdd}
        initialQuery="Coldplay"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: `${MOCK_SEARCH_RESULTS[0].title} 추가` }));

    expect(handleAdd).toHaveBeenCalledWith(MOCK_SEARCH_RESULTS[0]);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('플레이리스트에 추가했어요 🎵')).toBeTruthy();
  });

  it('shows an error toast when the API-backed search fails', async () => {
    mockUseYoutubeSearch.mockReturnValue({
      ...idleSearchQuery,
      isError: true,
      error: new ApiClientError(
        'YouTube API 호출에 실패했습니다.',
        'SERVER_YOUTUBE_API_ERROR',
        502,
      ),
    } as ReturnType<typeof useYoutubeSearch>);

    render(
      <YoutubeSearchPanel
        open
        roomName="Chill Night"
        onClose={() => undefined}
        onAdd={() => undefined}
        initialQuery="Coldplay"
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(1);
    });
    expect(
      screen.getAllByText('YouTube 검색에 실패했어요. 잠시 후 다시 검색해 주세요.').length,
    ).toBeGreaterThan(1);
  });
});
