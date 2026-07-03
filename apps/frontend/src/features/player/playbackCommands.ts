'use client';

// Host 전용 playback Socket 명령을 Promise 기반 함수로 감싼다.
import { socketClient } from '@/shared/lib/socket/socketClient';
import type { SocketAck } from '@/shared/types/api';
import { createSocketError } from '@/shared/types/socket';

const getSocket = () => {
  const socket = socketClient.get();

  if (!socket) {
    throw new Error('Socket is not connected.');
  }

  return socket;
};

const resolveAck = (response: SocketAck, resolve: () => void, reject: (reason: Error) => void) => {
  if (response.success) {
    resolve();
    return;
  }

  reject(createSocketError(response.error));
};

export const playbackCommands = {
  changeTrack: (roomId: string, playlistItemId: string) =>
    new Promise<void>((resolve, reject) => {
      getSocket().emit('playback:change-track', { playlistItemId, roomId }, (response) => {
        resolveAck(response, resolve, reject);
      });
    }),
  pause: (roomId: string, currentTime: number) =>
    new Promise<void>((resolve, reject) => {
      getSocket().emit('playback:pause', { currentTime, roomId }, (response) => {
        resolveAck(response, resolve, reject);
      });
    }),
  play: (roomId: string, currentTime: number) =>
    new Promise<void>((resolve, reject) => {
      getSocket().emit('playback:play', { currentTime, roomId }, (response) => {
        resolveAck(response, resolve, reject);
      });
    }),
  reportError: (roomId: string, videoId: string, errorCode: number) =>
    new Promise<void>((resolve, reject) => {
      getSocket().emit('playback:error', { errorCode, roomId, videoId }, (response) => {
        resolveAck(response, resolve, reject);
      });
    }),
  requestSync: (roomId: string) => {
    getSocket().emit('playback:sync-request', { roomId });
  },
  seek: (roomId: string, seekTime: number) =>
    new Promise<void>((resolve, reject) => {
      getSocket().emit('playback:seek', { roomId, seekTime }, (response) => {
        resolveAck(response, resolve, reject);
      });
    }),
};
