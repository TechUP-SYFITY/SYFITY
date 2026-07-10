import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import { server } from '@/shared/mocks/server';

import { usePlayerStore } from '@/features/player/playerStore';
import { usePlaylistStore } from '@/features/playlist/playlistStore';
import { useRoomStore } from '@/features/room/roomStore';

import { RoomPageClient } from './RoomPageClient';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('RoomPageClient', () => {
  afterEach(() => {
    cleanup();
    useRoomStore.getState().clearRoom();
    usePlaylistStore.getState().clearPlaylist();
    usePlayerStore.getState().clearPlayback();
  });

  it('Strict Mode에서도 join 실패 시 로딩에 머무르지 않고 에러 상태를 렌더링한다', async () => {
    const Wrapper = createWrapper();

    render(
      <StrictMode>
        <Wrapper>
          <RoomPageClient roomId="preview-room" />
        </Wrapper>
      </StrictMode>,
    );

    expect(await screen.findByText('Room에 입장하지 못했어요')).toBeInTheDocument();
    expect(screen.getByText('존재하지 않거나 입장할 수 없는 Room입니다.')).toBeInTheDocument();
  });

  it('검색 결과 곡 추가 실패를 SearchPanel 안에 표시한다', async () => {
    let requestedRoomId: string | undefined;

    server.use(
      http.post('*/api/v1/rooms/:roomId/playlist', ({ params }) => {
        requestedRoomId = String(params.roomId);

        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'PLAYLIST_VIDEO_UNAVAILABLE',
              message: 'Video unavailable',
            },
          },
          { status: 400 },
        );
      }),
    );

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPageClient roomId={roomFixture.room.inviteCode} />
      </Wrapper>,
    );

    const [openSearchButton] = await screen.findAllByRole('button', { name: '추가' });
    expect(openSearchButton).toBeDefined();
    fireEvent.click(openSearchButton as HTMLButtonElement);

    expect(await screen.findByRole('dialog', { name: '곡 추가' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('YouTube 영상 검색'), {
      target: { value: 'Night Changes' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Night Changes 추가' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('재생할 수 없는 영상이에요.');
    expect(requestedRoomId).toBe(roomFixture.room.id);
  });
});
