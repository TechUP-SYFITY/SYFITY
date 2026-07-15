import { getIo } from '../lib/io';

export function broadcastToRoom<T>(roomId: string, event: string, payload: T): void {
  getIo().to(`room:${roomId}`).emit(event, payload);
}
