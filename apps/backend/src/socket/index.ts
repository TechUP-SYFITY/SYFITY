import type { Server } from 'socket.io';

export function initSocket(io: Server): void {
  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      // 도메인별 disconnect 처리는 후속 Socket 핸들러에서 등록한다.
    });
  });
}
