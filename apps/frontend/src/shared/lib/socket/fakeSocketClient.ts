'use client';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import type { SocketAck } from '@/shared/types/api';
import type { ChatMessage, PlaybackPolicy, PlaybackState } from '@/shared/types/domain';
import type {
  ChatSendAckData,
  ChatSendPayload,
  ClientToServerEvents,
  PlaybackChangeTrackPayload,
  PlaybackCurrentTimePayload,
  PlaybackErrorPayload,
  PlaybackSeekPayload,
  PlaybackEndedPayload,
  PlaybackUpdateSettingsPayload,
} from '@/shared/types/socket';

import type { SocketClient, SyfityListenEvents, SyfitySocket } from './types';

type Listener = (...args: unknown[]) => void;
type EmitLocal = <Ev extends keyof SyfityListenEvents>(
  event: Ev,
  ...args: Parameters<SyfityListenEvents[Ev]>
) => void;
type Ack<T = undefined> = (response: SocketAck<T>) => void;

interface FakeSocketContext {
  emitLocal: EmitLocal;
  getPlaybackState: () => PlaybackState;
  getPlaybackPolicy: () => PlaybackPolicy;
  setPlaybackState: (state: PlaybackState) => void;
  setPlaybackPolicy: (policy: PlaybackPolicy) => void;
}

const createFakeSocket = (): SyfitySocket => {
  const listeners = new Map<keyof SyfityListenEvents, Set<Listener>>();
  let playbackState: PlaybackState = { ...roomFixture.playbackState };
  let playbackPolicy: PlaybackPolicy = { ...roomFixture.playbackPolicy } as PlaybackPolicy;

  const emitLocal: EmitLocal = (event, ...args) => {
    listeners.get(event)?.forEach((listener) => listener(...args));
  };

  emitLocalRef = emitLocal;
  queueMicrotask(() => emitLocal('connect'));

  return {
    connect: () => {},
    connected: true,
    disconnect: () => {
      listeners.clear();
    },
    emit: (event, ...args) => {
      handleClientEvent(event, [...args], {
        emitLocal,
        getPlaybackState: () => playbackState,
        getPlaybackPolicy: () => playbackPolicy,
        setPlaybackState: (state) => {
          playbackState = state;
        },
        setPlaybackPolicy: (policy) => {
          playbackPolicy = policy;
        },
      });
    },
    off: (event, listener) => {
      if (!listener) {
        listeners.delete(event);
        return;
      }

      listeners.get(event)?.delete(listener as Listener);
    },
    on: (event, listener) => {
      const eventListeners = listeners.get(event) ?? new Set<Listener>();
      eventListeners.add(listener as Listener);
      listeners.set(event, eventListeners);
    },
  };
};

let instance: SyfitySocket | null = null;
let emitLocalRef: EmitLocal | null = null;

export const fakeSocketClient: SocketClient = {
  connect: () => (instance ??= createFakeSocket()),
  disconnect: () => {
    instance?.disconnect();
    instance = null;
    emitLocalRef = null;
  },
  get: () => instance,
};

/** 개발 환경에서 fake socket의 S→C 이벤트를 수동으로 주입한다. */
export function simulateServerEvent<Ev extends keyof SyfityListenEvents>(
  event: Ev,
  ...args: Parameters<SyfityListenEvents[Ev]>
) {
  emitLocalRef?.(event, ...args);
}

function handleClientEvent<Ev extends keyof ClientToServerEvents>(
  event: Ev,
  args: unknown[],
  ctx: FakeSocketContext,
) {
  switch (event) {
    case 'room:join': {
      const ack = readAck(args[1]);
      ctx.emitLocal('room:joined', {
        roomId: (args[0] as { roomId: string }).roomId,
        hostConnection: { status: 'connected' },
        playbackState: ctx.getPlaybackState(),
        playbackPolicy: ctx.getPlaybackPolicy(),
        playlist: roomFixture.playlist,
        members: roomFixture.members,
        recentChats: roomFixture.chats,
      });
      ack?.({ success: true });
      break;
    }

    case 'room:leave':
      break;

    case 'playback:play': {
      const payload = args[0] as PlaybackCurrentTimePayload;
      const ack = readAck(args[1]);
      const current = ctx.getPlaybackState();

      if (current.videoId === null) {
        const firstAvailable = roomFixture.playlist.find((item) => item.status === 'available');

        if (!firstAvailable) {
          ack?.({
            success: false,
            error: {
              code: 'PLAYLIST_ITEM_NOT_FOUND',
              message: 'Playable item not found',
            },
          });
          return;
        }

        const next = updatePlaybackState(current, {
          currentTime: 0,
          isPlaying: true,
          playlistItemId: firstAvailable.id,
          videoId: firstAvailable.videoId,
        });

        ctx.setPlaybackState(next);
        ack?.({ success: true });
        ctx.emitLocal('playback:change-track', next);
        ctx.emitLocal('chat:system', createSystemMessage('Host가 재생을 시작했습니다.'));
        return;
      }

      const next = updatePlaybackState(current, {
        currentTime: payload.currentTime,
        isPlaying: true,
      });

      ctx.setPlaybackState(next);
      ack?.({ success: true });
      ctx.emitLocal('playback:play', next);
      ctx.emitLocal('chat:system', createSystemMessage('Host가 재생을 시작했습니다.'));
      break;
    }

    case 'playback:pause': {
      const payload = args[0] as PlaybackCurrentTimePayload;
      const ack = readAck(args[1]);
      const next = updatePlaybackState(ctx.getPlaybackState(), {
        currentTime: payload.currentTime,
        isPlaying: false,
      });

      ctx.setPlaybackState(next);
      ack?.({ success: true });
      ctx.emitLocal('playback:pause', next);
      ctx.emitLocal('chat:system', createSystemMessage('Host가 일시정지했습니다.'));
      break;
    }

    case 'playback:seek': {
      const payload = args[0] as PlaybackSeekPayload;
      const ack = readAck(args[1]);
      const next = updatePlaybackState(ctx.getPlaybackState(), {
        currentTime: payload.seekTime,
      });

      ctx.setPlaybackState(next);
      ack?.({ success: true });
      ctx.emitLocal('playback:seek', next);
      break;
    }

    case 'playback:change-track': {
      const payload = args[0] as PlaybackChangeTrackPayload;
      const ack = readAck(args[1]);
      const available = roomFixture.playlist.filter((item) => item.status === 'available');
      const currentIndex = available.findIndex(
        (item) => item.id === ctx.getPlaybackState().playlistItemId,
      );
      let targetItem = available.find((item) => item.id === payload.playlistItemId);
      if (payload.action !== 'select' && available.length) {
        const offset = payload.action === 'previous' ? -1 : 1;
        targetItem = available[(currentIndex + offset + available.length) % available.length];
      }

      if (targetItem?.status !== 'available') {
        ack?.({
          success: false,
          error: {
            code: 'PLAYLIST_ITEM_NOT_FOUND',
            message: 'Playlist item not found',
          },
        });
        return;
      }

      const next = updatePlaybackState(ctx.getPlaybackState(), {
        currentTime: 0,
        isPlaying: true,
        playlistItemId: targetItem.id,
        videoId: targetItem.videoId,
      });

      ctx.setPlaybackState(next);
      ack?.({ success: true });
      ctx.emitLocal('playback:change-track', next);
      break;
    }

    case 'playback:update-settings': {
      const payload = args[0] as PlaybackUpdateSettingsPayload;
      const ack = readAck(args[1]);
      const currentPolicy = ctx.getPlaybackPolicy();
      const policy: PlaybackPolicy = {
        repeatMode: payload.repeatMode ?? currentPolicy.repeatMode,
        shuffleEnabled: payload.shuffleEnabled ?? currentPolicy.shuffleEnabled,
      };
      ctx.setPlaybackPolicy(policy);
      ack?.({ success: true });
      ctx.emitLocal('playback:settings', {
        ...policy,
        playbackVersion: ctx.getPlaybackState().playbackVersion + 1,
      });
      break;
    }

    case 'playback:ended': {
      const payload = args[0] as PlaybackEndedPayload;
      const ack = readAck(args[1]);
      const current = ctx.getPlaybackState();
      if (
        current.playlistItemId === payload.playlistItemId &&
        current.playbackVersion === payload.playbackVersion
      ) {
        const available = roomFixture.playlist.filter((item) => item.status === 'available');
        const index = available.findIndex((item) => item.id === current.playlistItemId);
        const next = available[(index + 1) % available.length];
        if (next) {
          const nextState = updatePlaybackState(current, {
            currentTime: 0,
            isPlaying: true,
            playlistItemId: next.id,
            videoId: next.videoId,
          });
          ctx.setPlaybackState(nextState);
          ctx.emitLocal('playback:change-track', nextState);
        }
      }
      ack?.({ success: true });
      break;
    }

    case 'playback:error': {
      const payload = args[0] as PlaybackErrorPayload;
      const ack = readAck(args[1]);

      ack?.({ success: true });
      ctx.emitLocal('playback:error', {
        errorCode: payload.errorCode,
        videoId: payload.videoId,
      });
      break;
    }

    case 'playback:sync-request': {
      ctx.emitLocal('playback:sync-response', ctx.getPlaybackState());
      break;
    }

    case 'chat:send': {
      const payload = args[0] as ChatSendPayload;
      const ack = readAck<ChatSendAckData>(args[1]);
      const createdAt = new Date().toISOString();
      const message: ChatMessage = {
        createdAt,
        id: createId('mock-chat'),
        message: payload.message,
        nickname: roomFixture.members[0]?.nickname ?? null,
        profileImage: roomFixture.members[0]?.profileImage ?? null,
        type: 'user',
        userId: roomFixture.members[0]?.userId ?? null,
      };

      ctx.emitLocal('chat:received', message);
      ack?.({ success: true, data: message });
      break;
    }
  }
}

function readAck<T = undefined>(value: unknown): Ack<T> | undefined {
  return typeof value === 'function' ? (value as Ack<T>) : undefined;
}

function updatePlaybackState(current: PlaybackState, patch: Partial<PlaybackState>): PlaybackState {
  return {
    ...current,
    ...patch,
    playbackVersion: current.playbackVersion + 1,
    updatedAt: new Date().toISOString(),
  };
}

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function createSystemMessage(message: string): ChatMessage {
  return {
    createdAt: new Date().toISOString(),
    id: createId('mock-chat-system'),
    message,
    nickname: null,
    profileImage: null,
    type: 'system',
    userId: null,
  };
}
