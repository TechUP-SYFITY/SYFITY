import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

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

const createSearchQueryResult = (
  overrides: Partial<ReturnType<typeof useYoutubeSearchQuery>> = {},
) =>
  ({
    data: results,
    error: null,
    isError: false,
    isLoading: false,
    ...overrides,
  }) as unknown as ReturnType<typeof useYoutubeSearchQuery>;

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
    useYoutubeSearchQueryMock.mockReturnValue(createSearchQueryResult());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the Figma search panel with results', () => {
    renderPanel();

    expect(screen.getByRole('dialog', { name: '곡 추가' })).toBeTruthy();
    expect(screen.getByDisplayValue('Coldplay')).toBeTruthy();
    expect(screen.getByPlaceholderText('YouTube 영상 검색')).toBeTruthy();
    expect(screen.queryByText(/링크/)).toBeNull();
    expect(screen.getByText('검색 결과 1개')).toBeTruthy();
    expect(screen.getByText('Yellow')).toBeTruthy();
    expect(screen.getByText('Coldplay')).toBeTruthy();
    expect(screen.getByText('4:29')).toBeTruthy();
    expect(useYoutubeSearchQueryMock).toHaveBeenCalledWith('Coldplay');
  });

  it('uses a four-fifths viewport height for the mobile bottom sheet', () => {
    renderPanel();

    const dialog = screen.getByRole('dialog', { name: '곡 추가' });

    expect(dialog.className).toContain('h-[80dvh]');
    expect(dialog.className).toContain('max-h-[calc(100dvh-1rem)]');
    expect(dialog.className).not.toContain('h-[66.667dvh]');
    expect(dialog.className).not.toContain('max-h-[620px]');
  });

  it('calls onAddResult when a result add button is clicked', () => {
    const { onAddResult } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Yellow 추가' }));

    expect(onAddResult).toHaveBeenCalledWith(results[0]);
  });

  it('renders a playlist add error inside the search panel', () => {
    renderPanel({ addErrorMessage: '재생할 수 없는 영상이에요.' });

    expect(screen.getByRole('alert')).toHaveTextContent('재생할 수 없는 영상이에요.');
  });

  it('renders a loading state while searching', () => {
    useYoutubeSearchQueryMock.mockReturnValue(
      createSearchQueryResult({
        data: undefined,
        isLoading: true,
      }),
    );

    renderPanel();

    expect(screen.getByText('검색 중이에요')).toBeTruthy();
  });

  it('renders an empty state when the search has no results', () => {
    useYoutubeSearchQueryMock.mockReturnValue(createSearchQueryResult({ data: [] }));

    renderPanel({ initialQuery: 'Colplda' });

    expect(screen.getByText('검색 결과가 없어요')).toBeTruthy();
    expect(screen.getByText('"Colplda"에 대한 결과를 찾지 못했어요')).toBeTruthy();
  });

  it('renders an error state when the search request fails', () => {
    useYoutubeSearchQueryMock.mockReturnValue(
      createSearchQueryResult({
        data: undefined,
        error: new ApiClientError(
          {
            code: 'SERVER_YOUTUBE_API_ERROR',
            message: 'YouTube 검색 요청에 실패했어요.',
          },
          502,
        ),
        isError: true,
      }),
    );

    renderPanel();

    expect(screen.getByText('검색에 실패했어요')).toBeTruthy();
    expect(screen.getByText('YouTube 검색 요청에 실패했어요.')).toBeTruthy();
  });

  it('does not render the dialog or search active text when closed', () => {
    renderPanel({ isOpen: false });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useYoutubeSearchQueryMock).toHaveBeenCalledWith('');
  });

  it('calls onClose when the close button is clicked', () => {
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: '검색 패널 닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape 키를 누르면 패널을 닫는다', () => {
    const { onClose } = renderPanel();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('패널이 열리면 검색 입력창으로 포커스를 이동한다', () => {
    renderPanel();

    expect(screen.getByPlaceholderText('YouTube 영상 검색')).toHaveFocus();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const { onClose } = renderPanel();
    const backdrop = document.querySelector('div[data-state="open"]');

    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the dialog itself is clicked', () => {
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByRole('dialog'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
