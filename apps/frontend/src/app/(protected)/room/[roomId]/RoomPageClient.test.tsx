import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { JoinRoomResponse, UserProfileResponse } from '@syfity/shared';

import { ToastProvider } from '@/shared/components/ui';
import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import { server } from '@/shared/mocks/server';

import { useChatStore } from '@/features/chat/store/chatStore';
import { usePlayerStore } from '@/features/player/playerStore';
import { usePlaylistStore } from '@/features/playlist/playlistStore';
import { usePresenceStore } from '@/features/presence/presenceStore';
import { useRoomStore } from '@/features/room/roomStore';

import { RoomPageClient } from './RoomPageClient';
import { useRoomLiveConnections } from './useRoomLiveConnections';

vi.mock('./useRoomLiveConnections', () => ({
  useRoomLiveConnections: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ToastProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ToastProvider>
    );
  };
}

describe('RoomPageClient', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    useRoomStore.getState().clearRoom();
    usePresenceStore.getState().clearMembers();
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
    expect(useRoomLiveConnections).toHaveBeenCalledWith(
      roomFixture.room.id,
      true,
      expect.any(Function),
    );
  });

  it('Room 입장 응답의 최신순 recentChats를 오래된순으로 저장한다', async () => {
    server.use(
      http.post('*/api/v1/rooms/join', () =>
        HttpResponse.json({
          success: true,
          data: {
            members: roomFixture.members,
            playbackState: roomFixture.playbackState,
            playlist: roomFixture.playlist,
            recentChats: [...roomFixture.chats].reverse(),
            room: roomFixture.room,
          },
        } satisfies JoinRoomResponse),
      ),
    );
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPageClient roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText(roomFixture.room.name)).toBeInTheDocument();
    expect(useChatStore.getState().messages).toEqual(roomFixture.chats);
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
    expect(useRoomLiveConnections).not.toHaveBeenCalledWith(
      'stale-room-id',
      false,
      expect.any(Function),
    );
    expect(useRoomLiveConnections).toHaveBeenCalledWith(
      roomFixture.room.id,
      true,
      expect.any(Function),
    );
  });

  it('현재 사용자가 host가 아니면 host 제어를 제한하되 연결 끊김 배너는 표시하지 않는다', async () => {
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
    expect(screen.getByText('호스트 제어')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재생' })).toBeDisabled();
    expect(screen.queryByText('호스트 연결이 끊겼습니다. 재접속을 기다리는 중...')).toBeNull();
    expect(screen.getAllByText('지민').length).toBeGreaterThan(0);
  });

  it('Host 연결 상태에 따라 안내와 제어 권한을 전환한다', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPageClient roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText(roomFixture.room.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재생' })).toBeEnabled();

    act(() => {
      useRoomStore.getState().markHostDisconnected('2099-01-01T00:00:00.000Z');
    });

    expect(
      screen.getByText('호스트 연결이 끊겼습니다. 재접속을 기다리는 중...'),
    ).toBeInTheDocument();
    expect(screen.queryByText('호스트 제어')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재생' })).toBeDisabled();

    act(() => {
      useRoomStore.getState().markHostReconnected();
    });

    expect(screen.queryByText('호스트 연결이 끊겼습니다. 재접속을 기다리는 중...')).toBeNull();
    expect(screen.getByRole('button', { name: '재생' })).toBeEnabled();
  });

  it('Room 종료 callback으로 재생 상태를 정리한다', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPageClient roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText(roomFixture.room.name)).toBeInTheDocument();
    expect(usePlayerStore.getState().playbackState).not.toBeNull();

    const onRoomClosed = vi.mocked(useRoomLiveConnections).mock.calls.at(-1)?.[2];
    expect(onRoomClosed).toBeTypeOf('function');

    act(() => {
      onRoomClosed?.();
    });

    expect(usePlayerStore.getState().playbackState).toBeNull();
  });

  it('Room 초대 버튼으로 초대 모달을 열고 실제 초대 코드와 링크를 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'navigator',
      Object.create(window.navigator, {
        clipboard: { value: { writeText } },
      }),
    );
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPageClient roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '초대' }));

    expect(screen.getByRole('dialog', { name: '친구 초대' })).toBeInTheDocument();
    expect(screen.getAllByText(roomFixture.room.inviteCode).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '초대 코드 복사' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenNthCalledWith(1, roomFixture.room.inviteCode);
    });

    fireEvent.click(screen.getByRole('button', { name: '초대 링크 복사' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(`/room/join?code=${roomFixture.room.inviteCode}`),
      );
    });
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
    fireEvent.change(screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기'), {
      target: { value: 'Night Changes' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Night Changes 추가' }));

    const successMessages = await screen.findAllByText('플레이리스트에 추가했어요 🎵');
    const successToast =
      successMessages
        .find((message) => message.closest('[data-state="open"]'))
        ?.closest<HTMLElement>('[data-state="open"]') ?? null;
    const searchDialog = screen.getByRole('dialog', { name: '곡 추가' });

    expect(successToast).toHaveTextContent('플레이리스트에 추가했어요 🎵');
    expect(searchDialog).not.toContainElement(successToast);

    fireEvent.click((successToast as HTMLElement).querySelector('button') as HTMLButtonElement);
    await waitFor(() =>
      expect(screen.queryByText('플레이리스트에 추가했어요 🎵')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: '검색 패널 닫기' }));
    const [reopenSearchButton] = await screen.findAllByRole('button', { name: '추가' });
    fireEvent.click(reopenSearchButton as HTMLButtonElement);
    expect(screen.queryByText('플레이리스트에 추가했어요 🎵')).not.toBeInTheDocument();
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

    fireEvent.change(screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기'), {
      target: { value: 'Night Changes' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Night Changes 추가' }));

    const errorMessages = await screen.findAllByText('재생할 수 없는 영상이에요.');
    const errorToast =
      errorMessages
        .find((message) => message.closest('[data-state="open"]'))
        ?.closest<HTMLElement>('[data-state="open"]') ?? null;
    const searchDialog = screen.getByRole('dialog', { name: '곡 추가' });

    expect(errorToast).toHaveTextContent('재생할 수 없는 영상이에요.');
    expect((errorToast as HTMLElement).querySelector('button')).toBeInTheDocument();
    expect(searchDialog).not.toContainElement(errorToast);
    expect(requestedRoomId).toBe(roomFixture.room.id);
  });

  it('패널을 닫으면 진행 중이던 곡 추가 완료가 Toast를 되살리지 않는다', async () => {
    let releaseRequest!: () => void;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const delayedItem = {
      ...roomFixture.playlist[0],
      id: 'delayed-added-item',
      position: roomFixture.playlist.length + 1,
    };

    server.use(
      http.post('*/api/v1/rooms/:roomId/playlist', async () => {
        await requestGate;
        return HttpResponse.json({ success: true, data: delayedItem });
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
    fireEvent.change(screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기'), {
      target: { value: 'Night Changes' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Night Changes 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '검색 패널 닫기' }));

    releaseRequest();
    await waitFor(() =>
      expect(usePlaylistStore.getState().playlist.some((item) => item.id === delayedItem.id)).toBe(
        true,
      ),
    );

    const [reopenSearchButton] = await screen.findAllByRole('button', { name: '추가' });
    fireEvent.click(reopenSearchButton as HTMLButtonElement);
    expect(screen.queryByText('플레이리스트에 추가했어요 🎵')).not.toBeInTheDocument();
  });

  it('곡 추가 패널의 통합 입력창에서 YouTube URL을 추가한다', async () => {
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
    fireEvent.change(screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기'), {
      target: { value: 'https://youtu.be/yellow' },
    });
    fireEvent.click(screen.getByRole('button', { name: '링크 추가' }));

    await waitFor(() => {
      expect(requestedBody).toEqual({ youtubeUrl: 'https://youtu.be/yellow' });
    });

    const successMessages = await screen.findAllByText('플레이리스트에 추가했어요 🎵');
    const successToast =
      successMessages
        .find((message) => message.closest('[data-state="open"]'))
        ?.closest<HTMLElement>('[data-state="open"]') ?? null;

    expect(successToast).toHaveTextContent('플레이리스트에 추가했어요 🎵');
    expect(screen.getByRole('dialog', { name: '곡 추가' })).toBeInTheDocument();
  });
});
