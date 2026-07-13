import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
    expect(screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기')).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByText('검색 결과 1개')).toBeTruthy();
    expect(screen.getByText('Yellow')).toBeTruthy();
    expect(screen.getByText('Coldplay')).toBeTruthy();
    expect(screen.getByText('4:29')).toBeTruthy();
    expect(useYoutubeSearchQueryMock).toHaveBeenCalledWith('Coldplay');
  });

  it('keeps dialog accessibility full-screen while sizing only the visual surface', () => {
    renderPanel();

    const dialog = screen.getByRole('dialog', { name: '곡 추가' });
    const surface = dialog.querySelector('[data-search-panel-surface]');

    expect(dialog).toHaveClass('fixed', 'inset-0', 'pointer-events-none');
    expect(dialog).toHaveStyle({ pointerEvents: 'none' });
    expect(dialog).not.toHaveClass('overflow-hidden', 'lg:-translate-x-1/2');
    expect(surface).toHaveClass(
      'pointer-events-auto',
      'h-[80dvh]',
      'max-h-[calc(100dvh-1rem)]',
      'overflow-hidden',
      'lg:w-md',
      'lg:-translate-x-1/2',
    );
  });

  it('renders feedback beside the visual surface inside the dialog subtree', () => {
    renderPanel({ feedback: <p>곡 추가 피드백</p> });

    const dialog = screen.getByRole('dialog', { name: '곡 추가' });
    const surface = dialog.querySelector('[data-search-panel-surface]');
    const feedback = within(dialog).getByText('곡 추가 피드백');

    expect(dialog).toContainElement(feedback);
    expect(surface).not.toContainElement(feedback);
  });

  it('calls onAddResult when a result add button is clicked', () => {
    const { onAddResult } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Yellow 추가' }));

    expect(onAddResult).toHaveBeenCalledWith(results[0]);
  });

  it('bypasses search and submits a trimmed absolute URL', () => {
    const onAddUrl = vi.fn();
    renderPanel({ initialQuery: '', onAddUrl });

    const input = screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기');
    fireEvent.change(input, {
      target: { value: '  https://youtu.be/yellow  ' },
    });

    expect(useYoutubeSearchQueryMock).toHaveBeenLastCalledWith('');
    expect(screen.queryByText('검색 결과 1개')).not.toBeInTheDocument();
    expect(screen.getByText('https://youtu.be/yellow')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '링크 추가' }));

    expect(onAddUrl).toHaveBeenCalledWith('https://youtu.be/yellow');
  });

  it('submits a URL form with Enter behavior but ignores text submit', () => {
    const onAddUrl = vi.fn();
    renderPanel({ initialQuery: '', onAddUrl });

    const input = screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기');
    const form = input.closest('form');

    fireEvent.change(input, { target: { value: 'Coldplay' } });
    fireEvent.submit(form as HTMLFormElement);
    expect(onAddUrl).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=yellow' } });
    fireEvent.submit(form as HTMLFormElement);
    expect(onAddUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=yellow');
  });

  it('disables the link CTA while a playlist add is pending', () => {
    renderPanel({
      initialQuery: 'https://youtu.be/yellow',
      isAddPending: true,
      onAddUrl: vi.fn(),
    });

    expect(screen.getByRole('button', { name: '링크 추가' })).toBeDisabled();
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

    expect(screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기')).toHaveFocus();
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
