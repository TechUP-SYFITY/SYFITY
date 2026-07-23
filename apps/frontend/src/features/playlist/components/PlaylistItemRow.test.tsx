// Playlist 곡 행의 액션 노출과 드래그 핸들 이벤트 연결을 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistItemRow, type PlaylistItemRowProps } from './PlaylistItemRow';

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

function renderRow(overrides: Partial<PlaylistItemRowProps> = {}) {
  const props: PlaylistItemRowProps = {
    isCurrent: false,
    isDeleteEnabled: true,
    isDeletePending: false,
    isDragging: false,
    isFocused: false,
    isHost: true,
    isOwnItem: true,
    isReady: true,
    isReorderEnabled: true,
    isSelectEnabled: true,
    item,
    onBlurWithin: vi.fn(),
    onDelete: vi.fn(),
    onDragHandleKeyDown: vi.fn(),
    onFocusWithin: vi.fn(),
    onPreventMouseFocus: vi.fn((event) => event.preventDefault()),
    onSelect: vi.fn(),
    ...overrides,
  };

  render(<PlaylistItemRow {...props} />);
  return props;
}

describe('PlaylistItemRow', () => {
  afterEach(cleanup);

  it('dnd-kit 핸들에서도 mouse focus를 막고 pointer listener를 호출한다', () => {
    const onPointerDown = vi.fn((event: React.PointerEvent<HTMLButtonElement>) => {
      expect(event.defaultPrevented).toBe(false);
    });
    const props = renderRow({ dragHandleProps: { onPointerDown } });

    const dispatched = fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Night Changes 순서 변경' }),
      {
        pointerId: 1,
        pointerType: 'mouse',
      },
    );

    expect(dispatched).toBe(false);
    expect(props.onPreventMouseFocus).toHaveBeenCalledOnce();
    expect(onPointerDown).toHaveBeenCalledOnce();
    expect(onPointerDown).toHaveBeenCalledBefore(vi.mocked(props.onPreventMouseFocus));
  });

  it('Host가 곡 정보 영역을 선택하면 해당 항목을 한 번 전달한다', () => {
    const props = renderRow();

    fireEvent.click(screen.getByRole('button', { name: 'Night Changes 재생' }));

    expect(props.onSelect).toHaveBeenCalledOnce();
    expect(props.onSelect).toHaveBeenCalledWith(item.id);
  });

  it('드래그 핸들과 삭제 버튼은 곡 선택을 실행하지 않는다', () => {
    const props = renderRow();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Night Changes 순서 변경' }), {
      key: 'ArrowDown',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Night Changes 순서 변경' }));
    fireEvent.click(screen.getByRole('button', { name: 'Night Changes 삭제' }));

    expect(props.onSelect).not.toHaveBeenCalled();
    expect(props.onDelete).toHaveBeenCalledWith(item.id);
    expect(props.onDragHandleKeyDown).toHaveBeenCalledWith(item.id, 1);
  });
});
