'use client';

import { useEffect, useState } from 'react';

import { ApiClientError } from '@/shared/lib/api/apiClient';

import { SearchPanel } from './SearchPanel';
import type { SearchToastMessage } from './SearchToast';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useYoutubeSearch } from '../hooks/useYoutubeSearch';
import { SEARCH_RESULT_STATUS, type SearchResultStatus, type SearchVideo } from '../types/search';

const INVALID_YOUTUBE_LINK_TOAST = '유효하지 않은 링크예요. YouTube 링크를 붙여넣어 주세요.';
const ADDED_TO_PLAYLIST_TOAST = '플레이리스트에 추가했어요 🎵';
const TOAST_TIMEOUT_MS = 2600;

interface YoutubeSearchPanelProps {
  open: boolean;
  roomName: string;
  onClose: () => void;
  onAdd: (video: SearchVideo) => void;
  initialQuery?: string;
}

export function YoutubeSearchPanel({
  open,
  roomName,
  onClose,
  onAdd,
  initialQuery = '',
}: YoutubeSearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [toast, setToast] = useState<SearchToastMessage | null>(null);
  const normalizedQuery = query.trim();
  const hasInvalidYoutubeLink = isInvalidYoutubeLink(normalizedQuery);
  const searchableQuery = hasInvalidYoutubeLink ? '' : normalizedQuery;
  const debouncedQuery = useDebouncedValue(searchableQuery, 350);
  const searchQuery = useYoutubeSearch(debouncedQuery);
  const results = searchQuery.data ?? [];
  const errorMessage = getSearchErrorMessage(searchQuery.error);
  const status = getSearchStatus({
    query: hasInvalidYoutubeLink ? '' : normalizedQuery,
    debouncedQuery,
    isFetching: searchQuery.isFetching,
    isError: searchQuery.isError,
    resultCount: results.length,
  });

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), TOAST_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!searchQuery.isError || hasInvalidYoutubeLink || !normalizedQuery) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast({
        type: 'error',
        message: errorMessage,
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [errorMessage, hasInvalidYoutubeLink, normalizedQuery, searchQuery.isError]);

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);

    if (isInvalidYoutubeLink(nextQuery.trim())) {
      setToast({
        type: 'error',
        message: INVALID_YOUTUBE_LINK_TOAST,
      });
    }
  };

  const handleAdd = (video: SearchVideo) => {
    onAdd(video);
    setToast({
      type: 'success',
      message: ADDED_TO_PLAYLIST_TOAST,
    });
  };

  return (
    <SearchPanel
      open={open}
      roomName={roomName}
      query={query}
      status={status}
      results={results}
      onClose={onClose}
      onQueryChange={handleQueryChange}
      onAdd={handleAdd}
      errorMessage={errorMessage}
      toast={toast}
      onDismissToast={() => setToast(null)}
    />
  );
}

function getSearchStatus({
  query,
  debouncedQuery,
  isFetching,
  isError,
  resultCount,
}: {
  query: string;
  debouncedQuery: string;
  isFetching: boolean;
  isError: boolean;
  resultCount: number;
}): SearchResultStatus {
  if (!query) {
    return SEARCH_RESULT_STATUS.idle;
  }

  if (query !== debouncedQuery || isFetching) {
    return SEARCH_RESULT_STATUS.loading;
  }

  if (isError) {
    return SEARCH_RESULT_STATUS.error;
  }

  return resultCount > 0 ? SEARCH_RESULT_STATUS.success : SEARCH_RESULT_STATUS.empty;
}

function getSearchErrorMessage(error: Error | null): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_TOKEN_EXPIRED') {
      return '로그인 후 다시 검색해 주세요.';
    }

    if (error.code === 'SERVER_YOUTUBE_QUOTA_EXCEEDED') {
      return 'YouTube 검색 한도가 초과됐어요. 잠시 후 다시 시도해 주세요.';
    }
  }

  return 'YouTube 검색에 실패했어요. 잠시 후 다시 검색해 주세요.';
}

function isInvalidYoutubeLink(query: string): boolean {
  if (!isHttpUrl(query)) {
    return false;
  }

  return !isYoutubeUrl(query);
}

function isHttpUrl(query: string): boolean {
  try {
    const url = new URL(query);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isYoutubeUrl(query: string): boolean {
  try {
    const host = new URL(query).hostname.toLowerCase();

    return host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com');
  } catch {
    return false;
  }
}
