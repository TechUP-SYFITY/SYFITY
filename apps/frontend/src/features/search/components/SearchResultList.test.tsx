import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchResultList } from './SearchResultList';
import { MOCK_SEARCH_RESULTS } from '../data/mockSearchResults';
import { SEARCH_RESULT_STATUS } from '../types/search';

describe('SearchResultList', () => {
  it('renders successful results and forwards add events', () => {
    const handleAdd = vi.fn();

    render(
      <SearchResultList
        status={SEARCH_RESULT_STATUS.success}
        results={MOCK_SEARCH_RESULTS}
        onAdd={handleAdd}
      />,
    );

    expect(screen.getByText('검색 결과 5개')).toBeTruthy();
    expect(screen.getByText(MOCK_SEARCH_RESULTS[0].title)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: `${MOCK_SEARCH_RESULTS[0].title} 추가` }));

    expect(handleAdd).toHaveBeenCalledWith(MOCK_SEARCH_RESULTS[0]);
  });

  it('renders loading, empty, idle, and error states', () => {
    const { rerender } = render(
      <SearchResultList
        status={SEARCH_RESULT_STATUS.loading}
        results={[]}
        onAdd={() => undefined}
      />,
    );

    expect(screen.getByText('검색 중')).toBeTruthy();

    rerender(
      <SearchResultList
        status={SEARCH_RESULT_STATUS.empty}
        results={[]}
        query="Colplda"
        onAdd={() => undefined}
      />,
    );
    expect(screen.getByText('검색 결과가 없어요')).toBeTruthy();
    expect(screen.getByText('"Colplda"에 대한 결과를 찾지 못했어요')).toBeTruthy();

    rerender(
      <SearchResultList status={SEARCH_RESULT_STATUS.idle} results={[]} onAdd={() => undefined} />,
    );
    expect(screen.getByText('검색할 곡을 입력해 주세요')).toBeTruthy();

    rerender(
      <SearchResultList status={SEARCH_RESULT_STATUS.error} results={[]} onAdd={() => undefined} />,
    );
    expect(screen.getByRole('alert').textContent).toContain('검색에 실패했어요');
  });
});
