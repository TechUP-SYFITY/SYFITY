import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('renders the current query and reports query changes', () => {
    const handleQueryChange = vi.fn();

    render(<SearchInput query="Coldplay" onQueryChange={handleQueryChange} />);

    const input = screen.getByRole('searchbox', { name: '곡 검색' }) as HTMLInputElement;
    expect(input.value).toBe('Coldplay');

    fireEvent.change(input, { target: { value: 'Yellow' } });

    expect(handleQueryChange).toHaveBeenCalledWith('Yellow');
  });
});
