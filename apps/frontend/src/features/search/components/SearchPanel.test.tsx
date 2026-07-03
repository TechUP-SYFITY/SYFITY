import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchPanel } from './SearchPanel';
import type { YoutubeSearchResult } from '../api/searchApi';
import { useYoutubeSearchQuery } from '../hooks/useYoutubeSearchQuery';

vi.mock('../hooks/useYoutubeSearchQuery', () => ({
  useYoutubeSearchQuery: vi.fn(),
}));

const useYoutubeSearchQueryMock = vi.mocked(useYoutubeSearchQuery);

const results: YoutubeSearchResult[] = [
  {
    videoId: 'yellow',
    title: 'Yellow',
    channelTitle: 'Coldplay',
    thumbnailUrl: 'https://i.ytimg.com/vi/yellow/default.jpg',
    duration: 269,
  },
];

const renderPanel = (props?: Partial<React.ComponentProps<typeof SearchPanel>>) => {
  const onClose = vi.fn();
  const onAddResult = vi.fn();

  render(
    <SearchPanel
      isOpen
      roomName="Chill Night"
      initialQuery="Coldplay"
      onClose={onClose}
      onAddResult={onAddResult}
      {...props}
    />,
  );

  return { onAddResult, onClose };
};

describe('SearchPanel', () => {
  beforeEach(() => {
    useYoutubeSearchQueryMock.mockReturnValue({
      data: results,
      error: null,
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useYoutubeSearchQuery>);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the Figma search panel with results', () => {
    renderPanel();

    expect(screen.getByRole('dialog', { name: '곡 추가' })).toBeTruthy();
    expect(screen.getByDisplayValue('Coldplay')).toBeTruthy();
    expect(screen.getByText('검색 결과 1개')).toBeTruthy();
    expect(screen.getByText('Yellow')).toBeTruthy();
    expect(screen.getByText('Coldplay')).toBeTruthy();
    expect(screen.getByText('4:29')).toBeTruthy();
    expect(useYoutubeSearchQueryMock).toHaveBeenCalledWith('Coldplay');
  });

  it('calls onAddResult when a result add button is clicked', () => {
    const { onAddResult } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Yellow 추가' }));

    expect(onAddResult).toHaveBeenCalledWith(results[0]);
  });

  it('renders an empty state when the search has no results', () => {
    useYoutubeSearchQueryMock.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useYoutubeSearchQuery>);

    renderPanel({ initialQuery: 'Colplda' });

    expect(screen.getByText('검색 결과가 없어요')).toBeTruthy();
    expect(screen.getByText('"Colplda"에 대한 결과를 찾지 못했어요')).toBeTruthy();
  });

  it('calls onClose when the close button is clicked', () => {
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: '검색 패널 닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
