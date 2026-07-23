// Playlist 순서 변경 상호작용의 드래그 상태와 요청 계산을 검증한다.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePlaylistReorderInteraction } from './usePlaylistReorderInteraction';

const playlist = [{ id: 'first' }, { id: 'second' }, { id: 'third' }];

function renderReorderInteraction() {
  const onBeforeReorder = vi.fn();
  const onReorder = vi.fn();
  const result = renderHook(() =>
    usePlaylistReorderInteraction({
      canControlRoom: true,
      isReady: true,
      onBeforeReorder,
      onReorder,
      playlist,
    }),
  );

  return { ...result, onBeforeReorder, onReorder };
}

describe('usePlaylistReorderInteraction', () => {
  it('아래 항목으로 드래그하면 대상 행 아래 삽입 위치를 노출한다', () => {
    const { result } = renderReorderInteraction();

    act(() => result.current.handleDragStart('first'));
    act(() => result.current.handleDragOver('third'));

    expect(result.current.draggingItemId).toBe('first');
    expect(result.current.dropTargetItemId).toBe('third');
    expect(result.current.dropPosition).toBe('after');
  });

  it('위 항목으로 드래그하면 대상 행 위 삽입 위치를 노출한다', () => {
    const { result } = renderReorderInteraction();

    act(() => result.current.handleDragStart('third'));
    act(() => result.current.handleDragOver('first'));

    expect(result.current.dropTargetItemId).toBe('first');
    expect(result.current.dropPosition).toBe('before');
  });

  it('드롭하면 시각 상태를 초기화하고 연속 position 요청을 제출한다', () => {
    const { result, onBeforeReorder, onReorder } = renderReorderInteraction();

    act(() => result.current.handleDragStart('first'));
    act(() => result.current.handleDragOver('third'));
    act(() => result.current.handleDragEnd('third'));

    expect(result.current.draggingItemId).toBeNull();
    expect(result.current.dropTargetItemId).toBeNull();
    expect(result.current.dropPosition).toBeNull();
    expect(onBeforeReorder).toHaveBeenCalledOnce();
    expect(onReorder).toHaveBeenCalledWith({
      items: [
        { id: 'second', position: 1 },
        { id: 'third', position: 2 },
        { id: 'first', position: 3 },
      ],
    });
  });

  it('드래그 취소 시 요청 없이 시각 상태만 초기화한다', () => {
    const { result, onReorder } = renderReorderInteraction();

    act(() => result.current.handleDragStart('first'));
    act(() => result.current.handleDragOver('second'));
    act(() => result.current.handleDragCancel());

    expect(result.current.draggingItemId).toBeNull();
    expect(result.current.dropTargetItemId).toBeNull();
    expect(result.current.dropPosition).toBeNull();
    expect(onReorder).not.toHaveBeenCalled();
  });
});
