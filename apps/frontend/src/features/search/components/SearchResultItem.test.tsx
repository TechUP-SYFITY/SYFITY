import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchResultItem } from './SearchResultItem';
import { MOCK_SEARCH_RESULTS } from '../data/mockSearchResults';

describe('SearchResultItem', () => {
  it('renders video details and calls onAdd with the selected video', () => {
    const video = MOCK_SEARCH_RESULTS[0];
    const handleAdd = vi.fn();

    render(<SearchResultItem video={video} onAdd={handleAdd} />);

    expect(screen.getByText(video.title)).toBeTruthy();
    expect(screen.getByText(video.channelTitle)).toBeTruthy();
    expect(screen.getByText('4:29')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: `${video.title} 추가` }));

    expect(handleAdd).toHaveBeenCalledWith(video);
  });
});
