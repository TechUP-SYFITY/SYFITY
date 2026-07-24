import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { JoinRoomDialog } from './JoinRoomDialog';
import { roomApi, type RoomApi } from '../api/roomApi';

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('JoinRoomDialog', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('추방된 사용자의 재입장을 별도 차단 상태로 안내한다', async () => {
    const onOpenChange = vi.fn();
    const roomApiClient: RoomApi = {
      ...roomApi,
      createRoomMembership: vi
        .fn()
        .mockRejectedValue(
          new ApiClientError(
            { code: 'ROOM_MEMBER_KICKED', message: 'Host에 의해 추방된 사용자입니다.' },
            403,
          ),
        ),
    } as RoomApi;
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <JoinRoomDialog open onOpenChange={onOpenChange} roomApiClient={roomApiClient} />
      </Wrapper>,
    );

    fireEvent.change(screen.getByLabelText('초대 코드'), { target: { value: '3F9A2C' } });
    fireEvent.click(screen.getByRole('button', { name: '입장하기' }));

    expect(await screen.findByText('이 Room에서 추방되었어요')).toBeInTheDocument();
    expect(screen.getByText('Host가 다시 허용하기 전에는 입장할 수 없어요.')).toBeInTheDocument();
    expect(screen.queryByText(/유효하지 않은 초대 코드예요/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '홈으로 돌아가기' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerPush).toHaveBeenCalledWith('/home');
  });
});
