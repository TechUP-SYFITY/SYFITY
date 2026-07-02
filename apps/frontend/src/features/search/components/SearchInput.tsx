'use client';

import { CloseIcon, LinkIcon, SearchIcon } from './SearchIcons';

interface SearchInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function SearchInput({
  query,
  onQueryChange,
  isLoading = false,
  className = '',
}: SearchInputProps) {
  return (
    <div className={className}>
      <label htmlFor="room-youtube-search" className="sr-only">
        곡 검색
      </label>
      <div className="flex h-[45px] items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] px-[14px] transition focus-within:border-[#72f4a4]/35 focus-within:bg-white/[0.08] md:bg-white/[0.05]">
        <SearchIcon className="h-[15px] w-[15px] shrink-0 text-white/45" />
        <input
          id="room-youtube-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          value={query}
          placeholder="곡 제목 또는 아티스트 검색"
          aria-label="곡 검색"
          aria-busy={isLoading}
          onChange={(event) => onQueryChange(event.target.value)}
          className="search-input-control min-w-0 flex-1 bg-transparent text-sm leading-5 text-white outline-none placeholder:text-white/40"
        />
        {query ? (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => onQueryChange('')}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-white/40 transition hover:text-white/75"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 px-0.5 text-xs leading-4 text-white/35">
        <LinkIcon className="h-[11px] w-[11px] shrink-0" />
        <span className="truncate">YouTube / YouTube Music 링크를 붙여넣어도 돼요</span>
      </p>
    </div>
  );
}
