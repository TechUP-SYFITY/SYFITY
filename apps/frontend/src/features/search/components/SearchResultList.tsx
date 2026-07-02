'use client';

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
        <SearchStateMessage title="검색 중이에요" description="YouTube에서 곡을 찾고 있어요." />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex min-h-[68px] items-center gap-3 rounded-2xl px-2 py-2">
              <div className="h-11 w-11 rounded-xl bg-zinc-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded-full bg-zinc-100" />
                <div className="h-3 w-1/2 rounded-full bg-zinc-100" />
              </div>
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
        ? `"${query}"에 대한 결과를 찾지 못했어요.`
        : 'YouTube 곡 제목이나 링크를 입력해 주세요.';

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
      <div className="mb-2 px-2 text-xs font-semibold text-zinc-500">
        검색 결과 {results.length}개
      </div>
      <div className="space-y-1">
        {results.map((video) => (
          <SearchResultItem key={video.id} video={video} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

interface SearchStateMessageProps {
  title: string;
  description: string;
}

function SearchStateMessage({ title, description }: SearchStateMessageProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl px-6 py-8 text-center">
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-zinc-500">{description}</p>
    </div>
  );
}
