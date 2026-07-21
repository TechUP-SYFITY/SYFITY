import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserProfileResponse } from '@syfity/shared';

import { ToastProvider } from '@/shared/components/ui';
import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import { server } from '@/shared/mocks/server';

import { useChatStore } from '@/features/chat/store/chatStore';
import { usePlayerStore } from '@/features/player/store/playerStore';
import { usePlaylistStore } from '@/features/playlist/store/playlistStore';
import { usePresenceStore } from '@/features/presence/store/presenceStore';
import { useRoomStore } from '@/features/room/store/roomStore';

import { useRoomLiveConnections } from './hooks/useRoomLiveConnections';
import { RoomPage } from './RoomPage';

vi.mock('./hooks/useRoomLiveConnections', () => ({
  useRoomLiveConnections: vi.fn(),
}));

const { routerPush, routerReplace } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}));

vi.mock('@/shared/mocks/PresenceMockPanel', () => ({
  PresenceMockPanel: () => <div data-testid="presence-mock-panel" />,
}));

let didSeedSnapshot = false;

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

describe('RoomPage', () => {
  beforeEach(() => {
    didSeedSnapshot = false;
    vi.mocked(useRoomLiveConnections).mockImplementation(
      (_roomId, enabled, _onRoomClosed, onSnapshot) => {
        if (enabled && !didSeedSnapshot) {
          didSeedSnapshot = true;
          onSnapshot?.({
            roomId: roomFixture.room.id,
            hostConnection: { status: 'connected' },
            playbackState: roomFixture.playbackState,
            playbackPolicy: { repeatMode: 'off', shuffleEnabled: false },
            playlist: roomFixture.playlist,
            members: roomFixture.members,
            recentChats: roomFixture.chats,
          });
        }
      },
    );
  });

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
          <RoomPage roomId="unknown-room" />
        </Wrapper>
      </StrictMode>,
    );

    expect(await screen.findByText('Room에 입장하지 못했어요')).toBeInTheDocument();
    expect(screen.getByText('존재하지 않거나 입장할 수 없는 Room입니다.')).toBeInTheDocument();
    expect(screen.queryByTestId('presence-mock-panel')).toBeNull();
  });

  it('추방된 사용자가 Room URL로 재입장하면 전용 차단 문구를 표시한다', async () => {
    server.use(
      http.post('*/api/v1/room-memberships', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'ROOM_MEMBER_KICKED',
              message: 'Host에 의해 추방된 사용자입니다.',
            },
          },
          { status: 403 },
        ),
      ),
    );
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPage roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText('Room에 입장하지 못했어요')).toBeInTheDocument();
    expect(screen.getByText('Host가 다시 허용하기 전에는 입장할 수 없어요.')).toBeInTheDocument();
    expect(screen.queryByTestId('presence-mock-panel')).not.toBeInTheDocument();
  });

  it('mocking 활성 시 Room에 정상 입장하고 현재 사용자명을 표시한다', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPage roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText(roomFixture.room.name)).toBeInTheDocument();
    expect(screen.getAllByText(roomFixture.members[0].nickname).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '재생' })).toBeEnabled();
    expect(screen.queryByText('호스트 연결이 끊겼습니다. 재접속을 기다리는 중...')).toBeNull();
    expect(screen.getByTestId('presence-mock-panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '추방 관리' })).toBeInTheDocument();
    expect(useChatStore.getState().messages).toEqual(roomFixture.chats);
    expect(useRoomLiveConnections).toHaveBeenCalledWith(
      roomFixture.room.id,
      true,
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
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
        <RoomPage roomId={roomFixture.room.id} />
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
      expect.any(Function),
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
        <RoomPage roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText(roomFixture.room.name)).toBeInTheDocument();
    expect(screen.getByText('호스트 제어')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재생' })).toBeEnabled();
    expect(screen.queryByText('호스트 연결이 끊겼습니다. 재접속을 기다리는 중...')).toBeNull();
    expect(screen.getAllByText('지민').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '추방 관리' })).not.toBeInTheDocument();
  });

  it('Host 재접속 중에도 Member는 곡을 추가하고 본인 곡을 삭제할 수 있다', async () => {
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
        <RoomPage roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText(roomFixture.room.name)).toBeInTheDocument();

    act(() => {
      useRoomStore.getState().markHostDisconnected('2099-01-01T00:00:00.000Z');
    });

    expect(screen.getByRole('button', { name: '추가' })).toBeEnabled();
    fireEvent.focus(screen.getByTestId('playlist-row-fallback-dynamite'));
    expect(screen.getByRole('button', { name: 'Dynamite 삭제' })).toBeEnabled();
  });

  it('Host 연결 상태에 따라 안내와 제어 권한을 전환한다', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPage roomId={roomFixture.room.id} />
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

  it('Room 종료 callback으로 재생 상태를 정리하고 /home으로 이동한다', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPage roomId={roomFixture.room.id} />
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
    expect(routerReplace).toHaveBeenCalledWith('/home');
  });

  it('추방 이벤트를 받으면 Room 상태를 모두 정리하고 안내 후 /home으로 이동한다', async () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RoomPage roomId={roomFixture.room.id} />
      </Wrapper>,
    );

    expect(await screen.findByText(roomFixture.room.name)).toBeInTheDocument();
    expect(useRoomStore.getState().room).not.toBeNull();
    expect(usePresenceStore.getState().members).not.toHaveLength(0);
    expect(usePlaylistStore.getState().playlist).not.toHaveLength(0);
    expect(usePlayerStore.getState().playbackState).not.toBeNull();
    expect(useChatStore.getState().messages).not.toHaveLength(0);

    const onRoomKicked = vi.mocked(useRoomLiveConnections).mock.calls.at(-1)?.[4];
    const lateSnapshot = vi.mocked(useRoomLiveConnections).mock.calls.at(-1)?.[3];
    expect(onRoomKicked).toBeTypeOf('function');

    act(() => {
      onRoomKicked?.({
        roomId: roomFixture.room.id,
        message: 'Host에 의해 Room에서 추방되었습니다.',
      });
      onRoomKicked?.({
        roomId: roomFixture.room.id,
        message: 'Host에 의해 Room에서 추방되었습니다.',
      });
    });

    expect(useRoomStore.getState().room).toBeNull();
    expect(usePresenceStore.getState().members).toHaveLength(0);
    expect(usePlaylistStore.getState().playlist).toHaveLength(0);
    expect(usePlayerStore.getState().playbackState).toBeNull();
    expect(useChatStore.getState().messages).toHaveLength(0);
    expect(screen.getByText('Host에 의해 Room에서 추방되었습니다.')).toBeInTheDocument();
    expect(routerReplace).toHaveBeenCalledOnce();
    expect(routerReplace).toHaveBeenCalledWith('/home');

    await waitFor(() => {
      expect(vi.mocked(useRoomLiveConnections).mock.calls.at(-1)?.[1]).toBe(false);
    });

    act(() => {
      lateSnapshot?.({
        roomId: roomFixture.room.id,
        hostConnection: { status: 'connected' },
        playbackState: roomFixture.playbackState,
        playbackPolicy: roomFixture.playbackPolicy,
        playlist: roomFixture.playlist,
        members: roomFixture.members,
        recentChats: roomFixture.chats,
      });
    });

    expect(useRoomStore.getState().room).toBeNull();
    expect(usePresenceStore.getState().members).toHaveLength(0);
    expect(usePlaylistStore.getState().playlist).toHaveLength(0);
    expect(usePlayerStore.getState().playbackState).toBeNull();
    expect(useChatStore.getState().messages).toHaveLength(0);
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
        <RoomPage roomId={roomFixture.room.id} />
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
        <RoomPage roomId={roomFixture.room.id} />
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
        <RoomPage roomId={roomFixture.room.id} />
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
        <RoomPage roomId={roomFixture.room.id} />
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
        <RoomPage roomId={roomFixture.room.id} />
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
