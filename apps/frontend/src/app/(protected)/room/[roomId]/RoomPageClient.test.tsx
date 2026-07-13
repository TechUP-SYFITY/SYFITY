import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UserProfileResponse } from '@syfity/shared';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import { server } from '@/shared/mocks/server';

import { useChatStore } from '@/features/chat/chatStore';
import { usePlayerStore } from '@/features/player/playerStore';
import { usePlaylistStore } from '@/features/playlist/playlistStore';
import { useRoomStore } from '@/features/room/roomStore';

import { RoomPageClient } from './RoomPageClient';
import { useRoomLiveConnections } from './useRoomLiveConnections';

vi.mock('./useRoomLiveConnections', () => ({
  useRoomLiveConnections: vi.fn(),
}));

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
    vi.clearAllMocks();
    useRoomStore.getState().clearRoom();
    usePlaylistStore.getState().clearPlaylist();
    usePlayerStore.getState().clearPlayback();
    useChatStore.getState().clearMessages();
  });

  it('Strict Mode에서도 join 실패 시 로딩에 머무르지 않고 에러 상태를 렌더링한다', async () => {
    const Wrapper = createWrapper();

    render(
      <StrictMode>
        <Wrapper>
          <RoomPageClient roomId="unknown-room" />
        </Wrapper>
      </StrictMode>,
    );

    expect(await screen.findByText('Room에 입장하지 못했어요')).toBeInTheDocument();
    expect(screen.getByText('존재하지 않거나 입장할 수 없는 Room입니다.')).toBeInTheDocument();
  });

  it('mocking 활성 시 Room에 정상 입장하고 현재 사용자명을 표시한다', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPageClient roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText(roomFixture.room.name)).toBeInTheDocument();
    expect(screen.getAllByText(roomFixture.members[0].nickname).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '재생' })).toBeEnabled();
    expect(screen.queryByText('호스트 연결이 끊겼습니다. 재접속을 기다리는 중...')).toBeNull();
    expect(useChatStore.getState().messages).toEqual(roomFixture.chats);
    expect(useRoomLiveConnections).toHaveBeenCalledWith(roomFixture.room.id, true);
  });

  it('이전 Room 상태가 남아 있어도 URL의 roomId로 연결한다', async () => {
    useRoomStore.setState({
      room: {
        ...roomFixture.room,
        id: 'stale-room-id',
      },
    });
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPageClient roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText(roomFixture.room.name)).toBeInTheDocument();
    expect(useRoomLiveConnections).not.toHaveBeenCalledWith('stale-room-id', false);
    expect(useRoomLiveConnections).toHaveBeenCalledWith(roomFixture.room.id, true);
  });

  it('현재 사용자가 host가 아니면 host 전용 제어 안내를 표시한다', async () => {
    server.use(
      http.get('*/api/v1/me', () =>
        HttpResponse.json({
          success: true,
          data: {
            email: 'jimin@example.com',
            id: 'fallback-member-1',
            nickname: '지민',
            profileImage: null,
          },
        } satisfies UserProfileResponse),
      ),
    );
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPageClient roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText(roomFixture.room.name)).toBeInTheDocument();
    expect(
      screen.getByText('호스트 연결이 끊겼습니다. 재접속을 기다리는 중...'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('지민').length).toBeGreaterThan(0);
  });

  it('검색 결과 곡 추가 성공 Toast를 표시하고 SearchPanel을 유지한다', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPageClient roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    const [openSearchButton] = await screen.findAllByRole('button', { name: '추가' });
    fireEvent.click(openSearchButton as HTMLButtonElement);
    fireEvent.change(screen.getByPlaceholderText('YouTube 영상 검색'), {
      target: { value: 'Night Changes' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Night Changes 추가' }));

    const successStatuses = await screen.findAllByRole('status');
    const successToast = successStatuses.find((status) => status.matches('[data-state="open"]'));
    const searchDialog = screen.getByRole('dialog', { name: '곡 추가' });

    expect(successToast).toHaveTextContent('플레이리스트에 추가했어요 🎵');
    expect(searchDialog).toContainElement(successToast);

    fireEvent.click(screen.getByRole('button', { name: '검색 패널 닫기' }));
    await waitFor(() =>
      expect(screen.queryByText('플레이리스트에 추가했어요 🎵')).not.toBeInTheDocument(),
    );
  });

  it('검색 결과 곡 추가 실패 Toast를 표시하고 SearchPanel을 유지한다', async () => {
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
        <RoomPageClient roomId={roomFixture.room.id} />
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

    const errorToast = await screen.findByRole('alert');
    const searchDialog = screen.getByRole('dialog', { name: '곡 추가' });

    expect(errorToast).toHaveTextContent('재생할 수 없는 영상이에요.');
    expect(within(errorToast).getByRole('button', { name: '닫기' })).toBeInTheDocument();
    expect(searchDialog).toContainElement(errorToast);
    expect(requestedRoomId).toBe(roomFixture.room.id);
  });

  it('곡 추가 패널의 링크 탭에서 YouTube URL을 추가한다', async () => {
    let requestedBody: unknown;

    server.use(
      http.post('*/api/v1/rooms/:roomId/playlist', async ({ request }) => {
        requestedBody = await request.json();

        return HttpResponse.json({
          success: true,
          data: roomFixture.playlist[0],
        });
      }),
    );

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPageClient roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    const [openSearchButton] = await screen.findAllByRole('button', { name: '추가' });
    fireEvent.click(openSearchButton as HTMLButtonElement);
    fireEvent.mouseDown(await screen.findByRole('tab', { name: '링크' }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.change(screen.getByPlaceholderText('YouTube URL'), {
      target: { value: 'https://youtu.be/yellow' },
    });
    fireEvent.click(screen.getByRole('button', { name: '링크 추가' }));

    await waitFor(() => {
      expect(requestedBody).toEqual({ youtubeUrl: 'https://youtu.be/yellow' });
    });

    const successMessages = await screen.findAllByText('플레이리스트에 추가했어요 🎵');
    const visibleMessage = successMessages.find((message) =>
      message.closest('[data-state="open"][role="status"]'),
    );

    expect(visibleMessage?.closest('[role="status"]')).toHaveTextContent(
      '플레이리스트에 추가했어요 🎵',
    );
    expect(screen.getByRole('dialog', { name: '곡 추가' })).toBeInTheDocument();
  });
});
