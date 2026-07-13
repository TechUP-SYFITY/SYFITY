'use client';

import { ChevronDown, Inbox, Link2, LoaderCircle, Music2, Plus, Search, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { type ReactNode, useRef, useState } from 'react';

import { formatDuration } from '@/shared/lib/formatDuration';
import { cn } from '@/shared/lib/utils';

import type { YoutubeSearchResult } from '../api/searchApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useYoutubeSearchQuery } from '../hooks/useYoutubeSearchQuery';

const SEARCH_DEBOUNCE_DELAY = 350;

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

interface SearchPanelProps {
  feedback?: ReactNode;
  isAddPending?: boolean;
  isOpen: boolean;
  roomName: string;
  initialQuery?: string;
  onAddResult?: (result: YoutubeSearchResult) => void;
  onAddUrl?: (youtubeUrl: string) => void;
  onClose: () => void;
}

export function SearchPanel({
  feedback,
  isAddPending = false,
  isOpen,
  roomName,
  initialQuery = '',
  onAddResult,
  onAddUrl,
  onClose,
}: SearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();
  const isLinkInput = isAbsoluteHttpUrl(trimmedQuery);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_DELAY);
  const searchQuery = useYoutubeSearchQuery(isOpen && !isLinkInput ? debouncedQuery.trim() : '');
  const results = searchQuery.data ?? [];

  if (!isOpen) {
    return null;
  }

  const hasSearchQuery = trimmedQuery.length > 0;
  const hasResults = results.length > 0;
  const shouldShowEmpty =
    hasSearchQuery && !searchQuery.isLoading && !searchQuery.isError && !hasResults;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isLinkInput || !onAddUrl || isAddPending) {
      return;
    }

    onAddUrl(trimmedQuery);
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
          onClick={onClose}
        />
        <div className="pointer-events-none fixed inset-0 z-50 hidden bg-[radial-gradient(circle_at_50%_12%,rgba(114,244,164,0.08),transparent_26%),radial-gradient(circle_at_74%_79%,rgba(111,76,255,0.12),transparent_28%)] lg:block" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          aria-label="곡 추가"
          className="pointer-events-none fixed inset-0 z-50 outline-none"
          style={{ pointerEvents: 'none' }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            searchInputRef.current?.focus();
          }}
        >
          <div
            data-search-panel-surface
            className="pointer-events-auto absolute right-0 bottom-0 left-0 flex h-[80dvh] max-h-[calc(100dvh-1rem)] w-full animate-in flex-col overflow-hidden rounded-t-[24px] border border-white/[0.08] bg-[#101012]/95 text-white shadow-[0_-24px_80px_rgba(0,0,0,0.72)] duration-300 outline-none slide-in-from-bottom-4 lg:top-1/2 lg:right-auto lg:bottom-auto lg:left-1/2 lg:h-auto lg:max-h-[calc(100vh-8rem)] lg:w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[18px] lg:shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
          >
            <div className="flex h-5 items-center justify-center border-b border-white/[0.04] lg:hidden">
              <span className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 lg:px-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#72f4a4]/25 bg-[#72f4a4]/12 text-[#72f4a4] shadow-[0_0_22px_rgba(114,244,164,0.12)] lg:h-8 lg:w-8">
                  <Music2 className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <DialogPrimitive.Title className="text-base font-bold lg:text-sm">
                    곡 추가
                  </DialogPrimitive.Title>
                  <p className="mt-0.5 truncate text-xs text-white/40">{roomName}</p>
                </div>
              </div>
              <DialogPrimitive.Close asChild>
                <button
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white/55 transition hover:bg-white/[0.1] hover:text-white lg:h-7 lg:w-7 lg:bg-transparent"
                  type="button"
                  aria-label="검색 패널 닫기"
                >
                  <ChevronDown className="h-4 w-4 lg:hidden" aria-hidden />
                  <X className="hidden h-4 w-4 lg:block" aria-hidden />
                </button>
              </DialogPrimitive.Close>
            </header>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="border-b border-white/[0.07] px-4 py-4">
                <div className="relative">
                  {isLinkInput ? (
                    <Link2
                      className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/45"
                      aria-hidden
                    />
                  ) : (
                    <Search
                      className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/45"
                      aria-hidden
                    />
                  )}
                  <input
                    ref={searchInputRef}
                    className="h-[46px] w-full rounded-[18px] border border-white/[0.08] bg-white/[0.07] pr-11 pl-10 text-sm text-white transition outline-none placeholder:text-white/38 focus:border-[#72f4a4]/45 focus:bg-white/[0.09]"
                    placeholder="YouTube 영상 검색 또는 링크 붙여넣기"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query ? (
                    <button
                      className="absolute top-1/2 right-4 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-white/38 transition hover:text-white/70"
                      type="button"
                      aria-label="검색어 지우기"
                      onClick={() => setQuery('')}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="min-h-[280px] flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                {isLinkInput ? (
                  <SearchPanelLinkInput
                    canAdd={Boolean(onAddUrl)}
                    isAddPending={isAddPending}
                    url={trimmedQuery}
                  />
                ) : (
                  <>
                    {searchQuery.isLoading ? <SearchPanelLoading /> : null}
                    {searchQuery.isError ? (
                      <SearchPanelError message={searchQuery.error.message} />
                    ) : null}
                    {!searchQuery.isLoading && !searchQuery.isError && hasResults ? (
                      <>
                        <p className="border-b border-white/[0.055] px-4 py-3 text-xs text-white/45">
                          검색 결과 {results.length}개
                        </p>
                        <ul>
                          {results.map((result) => (
                            <SearchResultItem
                              key={result.videoId}
                              isAddPending={isAddPending}
                              result={result}
                              onAdd={onAddResult ? () => onAddResult(result) : undefined}
                            />
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {shouldShowEmpty ? <SearchPanelEmpty query={trimmedQuery} /> : null}
                    {!hasSearchQuery && !searchQuery.isLoading && !searchQuery.isError ? (
                      <SearchPanelIdle />
                    ) : null}
                  </>
                )}
              </div>
            </form>
          </div>
          {feedback}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SearchPanelLinkInput({
  canAdd,
  isAddPending,
  url,
}: {
  canAdd: boolean;
  isAddPending: boolean;
  url: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#72f4a4]/20 bg-[#72f4a4]/10 text-[#72f4a4]">
        <Link2 className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-bold text-white">이 링크를 플레이리스트에 추가할까요?</p>
      <p className="mt-2 max-w-full truncate text-xs text-white/45">{url}</p>
      <button
        className="mt-5 flex h-11 items-center justify-center gap-2 rounded-[18px] bg-[#72f4a4] px-6 text-sm font-bold text-black transition hover:bg-[#8af7b5] disabled:cursor-not-allowed disabled:opacity-45"
        type="submit"
        disabled={!canAdd || isAddPending}
        aria-label="링크 추가"
      >
        {isAddPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="h-4 w-4" aria-hidden />
        )}
        링크 추가
      </button>
    </div>
  );
}

function SearchResultItem({
  isAddPending,
  result,
  onAdd,
}: {
  isAddPending: boolean;
  result: YoutubeSearchResult;
  onAdd?: () => void;
}) {
  return (
    <li className="flex min-h-[68px] items-center gap-3 border-b border-white/[0.055] px-4 py-3 transition hover:bg-white/[0.025] lg:min-h-[69px]">
      <span
        className="h-11 w-11 shrink-0 rounded-2xl bg-cover bg-center"
        style={{ backgroundImage: `url(${result.thumbnailUrl})` }}
        role="img"
        aria-label={`${result.title} 썸네일`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{result.title}</p>
        <p className="mt-1 truncate text-xs text-white/42">{result.channelTitle}</p>
      </div>
      <span className="hidden text-xs text-white/42 sm:inline">
        {formatDuration(result.duration)}
      </span>
      <button
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#72f4a4]/20 bg-[#72f4a4]/10 px-3 text-xs font-bold text-[#72f4a4] transition hover:bg-[#72f4a4]/15 disabled:cursor-not-allowed disabled:opacity-45"
        type="button"
        aria-label={`${result.title} 추가`}
        disabled={!onAdd || isAddPending}
        onClick={onAdd}
      >
        <Plus className="h-3 w-3" aria-hidden />
        추가
      </button>
    </li>
  );
}

function SearchPanelLoading() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center text-white/45">
      <LoaderCircle className="h-7 w-7 animate-spin text-[#72f4a4]" aria-hidden />
      <p className="mt-4 text-sm font-semibold text-white/70">검색 중이에요</p>
    </div>
  );
}

function SearchPanelEmpty({ query }: { query: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-8 text-center">
      <EmptyStateIcon />
      <p className="mt-4 text-sm font-bold text-white">검색 결과가 없어요</p>
      <p className="mt-2 text-xs leading-5 text-white/45">
        &quot;{query}&quot;에 대한 결과를 찾지 못했어요
      </p>
    </div>
  );
}

function SearchPanelError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-8 text-center">
      <EmptyStateIcon className="text-red-300/80" />
      <p className="mt-4 text-sm font-bold text-white">검색에 실패했어요</p>
      <p className="mt-2 text-xs leading-5 text-white/45">{message}</p>
    </div>
  );
}

function SearchPanelIdle() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-8 text-center">
      <EmptyStateIcon />
      <p className="mt-4 text-sm font-bold text-white">검색어를 입력해 주세요</p>
      <p className="mt-2 text-xs leading-5 text-white/45">
        Room에 추가할 YouTube 영상을 검색할 수 있어요.
      </p>
    </div>
  );
}

function EmptyStateIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-white/35',
        className,
      )}
    >
      <Inbox className="h-6 w-6" aria-hidden />
    </span>
  );
}

export type { SearchPanelProps };
