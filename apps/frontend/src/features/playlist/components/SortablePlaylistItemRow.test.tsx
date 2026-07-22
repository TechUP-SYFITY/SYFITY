// sortable Playlist 행이 dnd-kit의 이동 상태와 transition을 올바르게 전달하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistItemRow } from './PlaylistItemRow';
import { SortablePlaylistItemRow } from './SortablePlaylistItemRow';

const mocks = vi.hoisted(() => ({
  useSortable: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: mocks.useSortable,
}));

vi.mock('./PlaylistItemRow', () => ({
  PlaylistItemRow: vi.fn(() => null),
}));

const item: PlaylistItem = {
  addedBy: 'host-1',
  channelTitle: 'One Direction',
  duration: 226,
  id: 'playlist-item-1',
  position: 1,
  status: 'available',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  title: 'Night Changes',
  videoId: 'video-1',
};

const defaultProps = {
  dropPosition: null,
  isCurrent: false,
  isDeleteEnabled: true,
  isDeletePending: false,
  isFocused: false,
  isHost: true,
  isOwnItem: true,
  isReady: true,
  isReorderEnabled: true,
  item,
  onBlurWithin: vi.fn(),
  onDelete: vi.fn(),
  onDragHandleKeyDown: vi.fn(),
  onFocusWithin: vi.fn(),
  onPreventMouseFocus: vi.fn(),
};

describe('SortablePlaylistItemRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { expectedTransition: 'transform 150ms ease', isDragging: false },
    { expectedTransition: undefined, isDragging: true },
  ])('isDragging=$isDragging일 때 transition을 구분한다', ({ expectedTransition, isDragging }) => {
    mocks.useSortable.mockReturnValue({
      attributes: {},
      isDragging,
      listeners: {},
      setActivatorNodeRef: vi.fn(),
      setNodeRef: vi.fn(),
      transform: { scaleX: 1, scaleY: 1, x: 0, y: 12 },
      transition: 'transform 150ms ease',
    });

    render(<SortablePlaylistItemRow {...defaultProps} />);

    expect(vi.mocked(PlaylistItemRow)).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isDragging,
        style: expect.objectContaining({ transition: expectedTransition }),
      }),
      undefined,
    );
  });
});
