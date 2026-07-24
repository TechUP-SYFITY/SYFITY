import type { Server, Socket } from 'socket.io';
import { describe, expect, it, vi } from 'vitest';

import { initSocket } from './index';

describe('initSocket', () => {
  it('연결된 소켓을 사용자 전용 room에 등록한다', () => {
    let onConnection: ((socket: Socket) => void) | undefined;
    const io = {
      use: vi.fn(),
      on: vi.fn((event: string, handler: (socket: Socket) => void) => {
        if (event === 'connection') onConnection = handler;
      }),
    } as unknown as Server;
    const socket = {
      id: 'socket-1',
      data: { userId: 'user-1' },
      join: vi.fn(),
      on: vi.fn(),
    } as unknown as Socket;

    initSocket(io);
    onConnection!(socket);

    expect(socket.join).toHaveBeenCalledWith('user:user-1');
  });
});
