import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchPanel } from './SearchPanel';
import { MOCK_SEARCH_RESULTS } from '../data/mockSearchResults';
import { SEARCH_RESULT_STATUS } from '../types/search';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SearchPanel', () => {
  it('renders room search controls and forwards interactions', () => {
    const handleClose = vi.fn();
    const handleQueryChange = vi.fn();
    const handleAdd = vi.fn();

    render(
      <SearchPanel
        open
        roomName="Chill Night"
        query="Coldplay"
        status={SEARCH_RESULT_STATUS.success}
        results={MOCK_SEARCH_RESULTS}
        onClose={handleClose}
        onQueryChange={handleQueryChange}
        onAdd={handleAdd}
      />,
    );

    expect(screen.getByRole('dialog', { name: '곡 추가' })).toBeTruthy();
    expect(screen.getByText('Chill Night')).toBeTruthy();

    fireEvent.change(screen.getByRole('searchbox', { name: '곡 검색' }), {
      target: { value: 'Yellow' },
    });
    fireEvent.click(screen.getByRole('button', { name: '검색 패널 닫기' }));
    fireEvent.click(screen.getByRole('button', { name: `${MOCK_SEARCH_RESULTS[0].title} 추가` }));

    expect(handleQueryChange).toHaveBeenCalledWith('Yellow');
    expect(handleClose).toHaveBeenCalledOnce();
    expect(handleAdd).toHaveBeenCalledWith(MOCK_SEARCH_RESULTS[0]);
  });

  it('does not expose the dialog when closed', () => {
    render(
      <SearchPanel
        open={false}
        roomName="Chill Night"
        query=""
        status={SEARCH_RESULT_STATUS.idle}
        results={[]}
        onClose={() => undefined}
        onQueryChange={() => undefined}
        onAdd={() => undefined}
      />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the panel mounted in a closed animation state', () => {
    const panelProps = {
      roomName: 'Chill Night',
      query: '',
      status: SEARCH_RESULT_STATUS.idle,
      results: [],
      onClose: () => undefined,
      onQueryChange: () => undefined,
      onAdd: () => undefined,
    };

    const { container, rerender } = render(<SearchPanel open {...panelProps} />);

    expect(screen.getByRole('dialog', { name: '곡 추가' }).className).toContain(
      'search-panel-dialog--open',
    );

    rerender(<SearchPanel open={false} {...panelProps} />);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-search-panel]')?.className).toContain(
      'search-panel-dialog--closed',
    );
  });
});
