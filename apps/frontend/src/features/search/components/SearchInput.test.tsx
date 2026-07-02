import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchInput } from './SearchInput';

afterEach(() => {
  cleanup();
});

describe('SearchInput', () => {
  it('renders the current query and reports query changes', () => {
    const handleQueryChange = vi.fn();

    render(<SearchInput query="Coldplay" onQueryChange={handleQueryChange} />);

    const input = screen.getByRole('searchbox', { name: '곡 검색' }) as HTMLInputElement;
    expect(input.value).toBe('Coldplay');

    fireEvent.change(input, { target: { value: 'Yellow' } });

    expect(handleQueryChange).toHaveBeenCalledWith('Yellow');
  });

  it('clears the query from the clear button', () => {
    const handleQueryChange = vi.fn();

    render(<SearchInput query="Coldplay" onQueryChange={handleQueryChange} />);

    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));

    expect(handleQueryChange).toHaveBeenCalledWith('');
  });

  it('uses a neutral search placeholder instead of seeded mock text', () => {
    render(<SearchInput query="" onQueryChange={() => undefined} />);

    expect(screen.getByPlaceholderText('곡 제목 또는 아티스트 검색')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Coldplay')).toBeNull();
  });
});
