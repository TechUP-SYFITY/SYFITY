'use client';

// Room 초대 코드 입장 API와 진입 화면 상태를 연결한다.
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiClientError } from '@/shared/types/api';

import { useJoinRoom } from './roomHooks';
import { parseInviteCode, RoomJoinView, type RoomJoinState } from './RoomJoinView';

interface RoomJoinPageClientProps {
  initialCode?: string;
}

export function RoomJoinPageClient({ initialCode = '' }: RoomJoinPageClientProps) {
  const router = useRouter();
  const joinRoom = useJoinRoom();
  const [code, setCode] = useState(() => parseInviteCode(initialCode));
  const [viewState, setViewState] = useState<RoomJoinState>('default');

  const handleCancel = () => {
    router.push('/home');
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    setViewState('default');
  };

  const handleSubmit = () => {
    setViewState('loading');
    joinRoom.mutate(
      { inviteCode: code },
      {
        onError: (error) => {
          setViewState(mapJoinErrorToState(error));
        },
        onSuccess: (data) => {
          router.push(`/room/${data.room.id}`);
        },
      },
    );
  };

  return (
    <RoomJoinView
      code={code}
      state={joinRoom.isPending ? 'loading' : viewState}
      onCancel={handleCancel}
      onCodeChange={handleCodeChange}
      onSubmit={handleSubmit}
    />
  );
}

function mapJoinErrorToState(error: unknown): RoomJoinState {
  if (!(error instanceof ApiClientError)) {
    return 'invalid-code';
  }

  if (error.code === 'ROOM_CLOSED') {
    return 'closed';
  }

  if (error.code === 'ROOM_INACTIVE') {
    return 'inactive';
  }

  return 'invalid-code';
}
