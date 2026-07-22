'use client';

// closed Room 비활성화의 사용자 피드백과 오류 상태를 조합한다.
import type { ErrorCode } from '@syfity/shared';

import { useToast } from '@/shared/components/ui/Toast';
import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';
import { ApiClientError } from '@/shared/types/api';

import { useDeactivateRoom } from './roomHooks';

const DEACTIVATION_ERROR_MESSAGES = {
  ROOM_NOT_CLOSED: '이미 상태가 변경되어 비활성화할 수 없는 Room이에요.',
  ROOM_NOT_FOUND: '이미 비활성화되었거나 찾을 수 없는 Room이에요.',
} satisfies Partial<Record<ErrorCode, string>>;

const isDeactivationStateError = (error: unknown) =>
  error instanceof ApiClientError &&
  (error.code === 'ROOM_NOT_CLOSED' || error.code === 'ROOM_NOT_FOUND');

export function useDeactivateRoomAction() {
  const { pushToast } = useToast();
  const mutation = useDeactivateRoom({
    onStateError: (error) => {
      pushToast({
        title: getApiErrorMessage(error, { codeOverrides: DEACTIVATION_ERROR_MESSAGES }),
        variant: 'error',
      });
    },
  });

  const deactivate = (roomId: string) => {
    if (mutation.isPending) {
      return;
    }

    mutation.mutate(roomId, {
      onSuccess: () => {
        pushToast({ title: 'Room을 비활성화했어요.', variant: 'success' });
      },
    });
  };

  return {
    deactivate,
    deactivatingRoomId: mutation.isPending ? mutation.variables : undefined,
    errorMessage:
      mutation.isError && !isDeactivationStateError(mutation.error)
        ? getApiErrorMessage(mutation.error, { codeOverrides: DEACTIVATION_ERROR_MESSAGES })
        : undefined,
    errorRoomId: mutation.isError ? mutation.variables : undefined,
    reset: mutation.reset,
  };
}
