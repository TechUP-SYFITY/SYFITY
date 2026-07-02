'use client';

import { MusicIcon } from './SearchIcons';
import { SearchResultItem } from './SearchResultItem';
import { SEARCH_RESULT_STATUS, type SearchResultStatus, type SearchVideo } from '../types/search';

interface SearchResultListProps {
  status: SearchResultStatus;
  results: SearchVideo[];
  onAdd: (video: SearchVideo) => void;
  query?: string;
  errorMessage?: string;
  className?: string;
}

export function SearchResultList({
  status,
  results,
  onAdd,
  query = '',
  errorMessage = '잠시 후 다시 검색해 주세요.',
  className = '',
}: SearchResultListProps) {
  if (status === SEARCH_RESULT_STATUS.loading) {
    return (
      <section className={className} aria-live="polite" aria-busy="true">
        <SearchResultHeader count={0} label="검색 중" />
        <div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-[68px] items-center gap-3 border-b border-white/[0.05] px-4 py-3"
            >
              <div className="h-11 w-11 rounded-2xl bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded-full bg-white/[0.06]" />
                <div className="h-3 w-1/3 rounded-full bg-white/[0.05]" />
              </div>
              <div className="h-7 w-16 rounded-2xl bg-white/[0.05]" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (status === SEARCH_RESULT_STATUS.error) {
    return (
      <section className={className} role="alert">
        <SearchStateMessage title="검색에 실패했어요" description={errorMessage} />
      </section>
    );
  }

  if (status === SEARCH_RESULT_STATUS.empty || results.length === 0) {
    const description =
      status === SEARCH_RESULT_STATUS.empty && query
        ? `"${query}"에 대한 결과를 찾지 못했어요`
        : '검색할 곡 제목이나 아티스트를 입력해 주세요.';

    return (
      <section className={className} aria-live="polite">
        <SearchStateMessage
          title={
            status === SEARCH_RESULT_STATUS.empty
              ? '검색 결과가 없어요'
              : '검색할 곡을 입력해 주세요'
          }
          description={description}
        />
      </section>
    );
  }

  return (
    <section className={className} aria-label="검색 결과">
      <SearchResultHeader count={results.length} />
      <div>
        {results.map((video) => (
          <SearchResultItem key={video.videoId} video={video} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

function SearchResultHeader({ count, label }: { count: number; label?: string }) {
  return (
    <div className="border-b border-white/[0.05] px-4 py-2.5 text-xs font-semibold leading-4 text-white/35">
      {label ?? `검색 결과 ${count}개`}
    </div>
  );
}

interface SearchStateMessageProps {
  title: string;
  description: string;
}

function SearchStateMessage({ title, description }: SearchStateMessageProps) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-16 text-center md:min-h-[242px]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.04] text-white/25">
        <MusicIcon className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-5 text-white">{title}</h3>
      <p className="mt-1 max-w-[220px] text-xs leading-[19.5px] text-white/40">{description}</p>
    </div>
  );
}
