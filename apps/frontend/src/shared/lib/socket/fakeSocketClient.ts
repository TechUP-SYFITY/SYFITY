'use client';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import type { SocketAck } from '@/shared/types/api';
import type { ChatMessage, PlaybackState } from '@/shared/types/domain';
import type {
  ChatSendAckData,
  ChatSendPayload,
  ClientToServerEvents,
  PlaybackChangeTrackPayload,
  PlaybackCurrentTimePayload,
  PlaybackErrorPayload,
  PlaybackSeekPayload,
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
  setPlaybackState: (state: PlaybackState) => void;
}

const createFakeSocket = (): SyfitySocket => {
  const listeners = new Map<keyof SyfityListenEvents, Set<Listener>>();
  let playbackState: PlaybackState = { ...roomFixture.playbackState };

  const emitLocal: EmitLocal = (event, ...args) => {
    listeners.get(event)?.forEach((listener) => listener(...args));
  };

  queueMicrotask(() => emitLocal('connect'));

  return {
    disconnect: () => {
      listeners.clear();
    },
    emit: (event, ...args) => {
      handleClientEvent(event, [...args], {
        emitLocal,
        getPlaybackState: () => playbackState,
        setPlaybackState: (state) => {
          playbackState = state;
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

export const fakeSocketClient: SocketClient = {
  connect: () => (instance ??= createFakeSocket()),
  disconnect: () => {
    instance?.disconnect();
    instance = null;
  },
  get: () => instance,
};

function handleClientEvent<Ev extends keyof ClientToServerEvents>(
  event: Ev,
  args: unknown[],
  ctx: FakeSocketContext,
) {
  switch (event) {
    case 'room:join': {
      const ack = readAck<{ playbackState: PlaybackState }>(args[1]);
      ack?.({ success: true, data: { playbackState: ctx.getPlaybackState() } });
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
        return;
      }

      const next = updatePlaybackState(current, {
        currentTime: payload.currentTime,
        isPlaying: true,
      });

      ctx.setPlaybackState(next);
      ack?.({ success: true });
      ctx.emitLocal('playback:play', next);
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
      const targetItem = roomFixture.playlist.find((item) => item.id === payload.playlistItemId);

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

      ack?.({ success: true, data: { createdAt: message.createdAt, id: message.id } });
      ctx.emitLocal('chat:received', message);
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
    updatedAt: new Date().toISOString(),
  };
}

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}
