'use client';

import { io } from 'socket.io-client';

import { env } from '@/shared/lib/env';

import type { SocketClient, SyfitySocket } from './types';

let socket: SyfitySocket | null = null;

export const realSocketClient: SocketClient = {
  connect: () => {
    socket ??= io(env.NEXT_PUBLIC_SOCKET_URL, {
      withCredentials: true,
    }) as unknown as SyfitySocket;

    return socket;
  },
  disconnect: () => {
    socket?.disconnect();
    socket = null;
  },
  get: () => socket,
};
