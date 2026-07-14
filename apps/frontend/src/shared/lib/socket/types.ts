import type { ClientToServerEvents, ServerToClientEvents } from '@/shared/types/socket';

type ReservedEvents = {
  connect: () => void;
  connect_error: (error: Error) => void;
  disconnect: (reason: string) => void;
};

export type SyfityListenEvents = ServerToClientEvents & ReservedEvents;

export interface SyfitySocket {
  readonly connected: boolean;
  emit<Ev extends keyof ClientToServerEvents>(
    event: Ev,
    ...args: Parameters<ClientToServerEvents[Ev]>
  ): void;
  on<Ev extends keyof SyfityListenEvents>(event: Ev, listener: SyfityListenEvents[Ev]): void;
  off<Ev extends keyof SyfityListenEvents>(event: Ev, listener?: SyfityListenEvents[Ev]): void;
  connect(): void;
  disconnect(): void;
}

export interface SocketClient {
  connect(): SyfitySocket;
  disconnect(): void;
  get(): SyfitySocket | null;
}
