'use client';

// closed Room 복구의 사용자 피드백과 성공 후 이동을 조합한다.
import { useRouter } from 'next/navigation';

import type { ErrorCode } from '@syfity/shared';

import { useToast } from '@/shared/components/ui/Toast';
import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';

import { useRecoverRoom } from './roomHooks';

const RECOVERY_ERROR_MESSAGES = {
  ROOM_NOT_CLOSED: '이미 복구되었거나 복구할 수 없는 Room이에요.',
  ROOM_RECOVERY_EXPIRED: '더 이상 사용할 수 없는 Room이에요.',
} satisfies Partial<Record<ErrorCode, string>>;

export function useRecoverRoomAction() {
  const router = useRouter();
  const { pushToast } = useToast();
  const mutation = useRecoverRoom();

  const recover = (roomId: string) => {
    if (mutation.isPending) {
      return;
    }

    mutation.mutate(roomId, {
      onSuccess: () => {
        pushToast({ title: 'Room을 복구했어요.', variant: 'success' });
        router.push(`/room/${roomId}`);
      },
    });
  };

  return {
    errorMessage: mutation.isError
      ? getApiErrorMessage(mutation.error, { codeOverrides: RECOVERY_ERROR_MESSAGES })
      : undefined,
    errorRoomId: mutation.isError ? mutation.variables : undefined,
    recover,
    recoveringRoomId: mutation.isPending ? mutation.variables : undefined,
    reset: mutation.reset,
  };
}
