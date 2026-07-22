// closed Room 비활성화 action의 성공 피드백과 오류 상태를 검증한다.
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import type * as RoomHooksModule from './roomHooks';
import { useDeactivateRoomAction } from './useDeactivateRoomAction';

const mocks = vi.hoisted(() => ({
  deactivateOptions: undefined as { onStateError?: (error: ApiClientError) => void } | undefined,
  mutate: vi.fn(),
  mutationState: {
    error: null as unknown,
    isError: false,
    isPending: false,
    variables: undefined as string | undefined,
  },
  pushToast: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('@/shared/components/ui/Toast', () => ({
  useToast: () => ({ pushToast: mocks.pushToast }),
}));

vi.mock('./roomHooks', async (importOriginal) => {
  const actual = await importOriginal<typeof RoomHooksModule>();

  return {
    ...actual,
    useDeactivateRoom: (options: { onStateError?: (error: ApiClientError) => void }) => {
      mocks.deactivateOptions = options;
      return {
        ...mocks.mutationState,
        mutate: mocks.mutate,
        reset: mocks.reset,
      };
    },
  };
});

describe('useDeactivateRoomAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationState.error = null;
    mocks.mutationState.isError = false;
    mocks.mutationState.isPending = false;
    mocks.mutationState.variables = undefined;
    mocks.deactivateOptions = undefined;
  });

  it('비활성화 성공을 안내한다', () => {
    const { result } = renderHook(() => useDeactivateRoomAction());

    act(() => result.current.deactivate('closed-room'));

    expect(mocks.mutate).toHaveBeenCalledWith('closed-room', expect.any(Object));
    const options = mocks.mutate.mock.calls[0][1] as { onSuccess: () => void };
    expect(options).not.toHaveProperty('onError');

    act(() => options.onSuccess());
    expect(mocks.pushToast).toHaveBeenCalledWith({
      title: 'Room을 비활성화했어요.',
      variant: 'success',
    });
  });

  it('pending 동안 비활성화 요청을 중복 실행하지 않는다', () => {
    mocks.mutationState.isPending = true;
    mocks.mutationState.variables = 'closed-room';
    const { result } = renderHook(() => useDeactivateRoomAction());

    act(() => result.current.deactivate('another-room'));

    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(result.current.deactivatingRoomId).toBe('closed-room');
  });

  it.each([
    ['ROOM_NOT_CLOSED', '이미 상태가 변경되어 비활성화할 수 없는 Room이에요.'],
    ['ROOM_NOT_FOUND', '이미 비활성화되었거나 찾을 수 없는 Room이에요.'],
  ])('%s 오류를 Toast로 안내하고 Dialog 메시지는 반환하지 않는다', (code, message) => {
    const error = new ApiClientError({ code, message: 'Deactivation failed' }, 409);
    mocks.mutationState.error = error;
    mocks.mutationState.isError = true;
    mocks.mutationState.variables = 'closed-room';
    const { result } = renderHook(() => useDeactivateRoomAction());

    act(() => mocks.deactivateOptions?.onStateError?.(error));

    expect(mocks.pushToast).toHaveBeenCalledWith({ title: message, variant: 'error' });
    expect(result.current.errorMessage).toBeUndefined();
    expect(result.current.errorRoomId).toBe('closed-room');
  });

  it('권한 오류를 Dialog용 상태로 반환한다', () => {
    mocks.mutationState.error = new ApiClientError(
      { code: 'AUTH_FORBIDDEN', message: 'Deactivation failed' },
      403,
    );
    mocks.mutationState.isError = true;
    mocks.mutationState.variables = 'closed-room';
    const { result } = renderHook(() => useDeactivateRoomAction());

    expect(result.current.errorMessage).toBe('이 작업을 할 권한이 없어요.');
    expect(result.current.errorRoomId).toBe('closed-room');
    expect(mocks.pushToast).not.toHaveBeenCalled();
  });
});
