'use client';

// Room 입장 동안 유지되는 Socket.IO singleton을 관리한다.
import { io, type Socket } from 'socket.io-client';

import type { ClientToServerEvents, ServerToClientEvents } from '@/shared/types/socket';

const DEFAULT_SOCKET_URL = 'http://localhost:4000';

export type SyfitySocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: SyfitySocket | null = null;

const getSocketUrl = () => process.env.NEXT_PUBLIC_SOCKET_URL ?? DEFAULT_SOCKET_URL;

export const socketClient = {
  connect: () => {
    socket ??= io(getSocketUrl(), {
      withCredentials: true,
    });

    return socket;
  },
  disconnect: () => {
    socket?.disconnect();
    socket = null;
  },
  get: () => socket,
};
