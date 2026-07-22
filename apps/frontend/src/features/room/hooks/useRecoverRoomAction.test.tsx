// closed Room 복구 action의 성공 피드백과 오류 상태를 검증한다.
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { useRecoverRoomAction } from './useRecoverRoomAction';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  mutationState: {
    error: null as unknown,
    isError: false,
    isPending: false,
    variables: undefined as string | undefined,
  },
  pushToast: vi.fn(),
  reset: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('@/shared/components/ui/Toast', () => ({
  useToast: () => ({ pushToast: mocks.pushToast }),
}));

vi.mock('./roomHooks', () => ({
  useRecoverRoom: () => ({
    ...mocks.mutationState,
    mutate: mocks.mutate,
    reset: mocks.reset,
  }),
}));

describe('useRecoverRoomAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationState.error = null;
    mocks.mutationState.isError = false;
    mocks.mutationState.isPending = false;
    mocks.mutationState.variables = undefined;
  });

  it('복구 성공을 안내하고 기존 Room 경로로 이동한다', () => {
    const { result } = renderHook(() => useRecoverRoomAction());

    act(() => result.current.recover('closed-room'));

    expect(mocks.mutate).toHaveBeenCalledWith('closed-room', expect.any(Object));
    const options = mocks.mutate.mock.calls[0][1] as { onSuccess: () => void };
    expect(options).not.toHaveProperty('onError');

    act(() => options.onSuccess());

    expect(mocks.pushToast).toHaveBeenCalledWith({
      title: 'Room을 복구했어요.',
      variant: 'success',
    });
    expect(mocks.routerPush).toHaveBeenCalledWith('/room/closed-room');
  });

  it('pending 동안 복구 요청을 중복 실행하지 않는다', () => {
    mocks.mutationState.isPending = true;
    mocks.mutationState.variables = 'closed-room';
    const { result } = renderHook(() => useRecoverRoomAction());

    act(() => result.current.recover('another-room'));

    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(result.current.recoveringRoomId).toBe('closed-room');
  });

  it.each([
    ['ROOM_NOT_CLOSED', '이미 복구되었거나 복구할 수 없는 Room이에요.'],
    ['ROOM_RECOVERY_EXPIRED', '더 이상 사용할 수 없는 Room이에요.'],
    ['AUTH_FORBIDDEN', '이 작업을 할 권한이 없어요.'],
  ])('%s 오류를 Dialog용 상태로 반환한다', (code, message) => {
    mocks.mutationState.error = new ApiClientError({ code, message: 'Recovery failed' }, 409);
    mocks.mutationState.isError = true;
    mocks.mutationState.variables = 'closed-room';

    const { result } = renderHook(() => useRecoverRoomAction());

    expect(result.current.errorMessage).toBe(message);
    expect(result.current.errorRoomId).toBe('closed-room');
    expect(mocks.pushToast).not.toHaveBeenCalled();
  });
});
