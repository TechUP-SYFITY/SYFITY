'use client';

import { SearchInput } from './SearchInput';
import { SearchResultList } from './SearchResultList';
import type { SearchResultStatus, SearchVideo } from '../types/search';

interface SearchPanelProps {
  open: boolean;
  roomName: string;
  query: string;
  status: SearchResultStatus;
  results: SearchVideo[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onAdd: (video: SearchVideo) => void;
  errorMessage?: string;
}

export function SearchPanel({
  open,
  roomName,
  query,
  status,
  results,
  onClose,
  onQueryChange,
  onAdd,
  errorMessage,
}: SearchPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 md:items-start md:px-6 md:pt-14">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-search-panel-title"
        className="max-h-[calc(100dvh-40px)] w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:max-h-[calc(100dvh-96px)] md:w-[448px] md:rounded-[24px]"
      >
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-zinc-300 md:hidden" />
        <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 md:px-6 md:pt-6">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-500">{roomName}</p>
            <h2 id="room-search-panel-title" className="mt-1 text-xl font-bold text-zinc-950">
              곡 추가
            </h2>
          </div>
          <button
            type="button"
            aria-label="검색 패널 닫기"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <SearchInput
            query={query}
            onQueryChange={onQueryChange}
            isLoading={status === 'loading'}
          />
          <SearchResultList
            className="mt-5 max-h-[calc(100dvh-280px)] overflow-y-auto pr-1 md:max-h-[360px]"
            status={status}
            results={results}
            query={query}
            errorMessage={errorMessage}
            onAdd={onAdd}
          />
        </div>
      </section>
    </div>
  );
}
