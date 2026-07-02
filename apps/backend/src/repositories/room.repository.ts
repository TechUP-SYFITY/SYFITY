import type { PrismaClient } from '../generated/prisma/client';
import type { CreateRoomData, IRoomRepository, RoomRecord } from '../types/room';

export type RoomTransactionPrisma = {
  room: Pick<PrismaClient['room'], 'create'>;
  roomMember: Pick<PrismaClient['roomMember'], 'create'>;
  playbackState: Pick<PrismaClient['playbackState'], 'create'>;
};

export type RoomRepositoryPrisma = {
  room: Pick<PrismaClient['room'], 'findUnique'>;
  $transaction: <T>(fn: (tx: RoomTransactionPrisma) => Promise<T>) => Promise<T>;
};

export class RoomRepository implements IRoomRepository {
  constructor(private readonly prisma: RoomRepositoryPrisma) {}

  async existsInviteCode(inviteCode: string): Promise<boolean> {
    const room = await this.prisma.room.findUnique({
      where: { inviteCode },
      select: { id: true },
    });

    return room !== null;
  }

  async existsRoom(roomId: string): Promise<boolean> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    return room !== null;
  }

  async createRoom(data: CreateRoomData): Promise<RoomRecord> {
    const now = new Date();
    const room = await this.prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: {
          name: data.name,
          hostId: data.hostId,
          visibility: 'private',
          inviteCode: data.inviteCode,
          status: 'active',
          lastActivityAt: now,
        },
        select: {
          id: true,
          name: true,
          inviteCode: true,
          status: true,
          createdAt: true,
        },
      });

      await tx.roomMember.create({
        data: {
          roomId: created.id,
          userId: data.hostId,
          role: 'host',
          status: 'offline',
          joinedAt: now,
        },
      });

      await tx.playbackState.create({
        data: {
          roomId: created.id,
          videoId: null,
          playlistItemId: null,
          baseCurrentTime: 0,
          isPlaying: false,
          serverStartedAt: null,
          serverPausedAt: null,
        },
      });

      return created;
    });

    return {
      id: room.id,
      name: room.name,
      inviteCode: room.inviteCode,
      status: room.status,
      createdAt: room.createdAt,
    };
  }
}
