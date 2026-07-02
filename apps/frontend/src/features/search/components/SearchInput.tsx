'use client';

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
      <input
        id="room-youtube-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        value={query}
        disabled={isLoading}
        placeholder="곡 제목 또는 YouTube 링크"
        aria-label="곡 검색"
        onChange={(event) => onQueryChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-[15px] font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="mt-2 text-xs font-medium text-zinc-500">
        YouTube / YouTube Music 링크를 붙여넣어도 돼요
      </p>
    </div>
  );
}
