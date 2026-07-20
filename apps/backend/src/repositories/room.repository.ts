import { Prisma, type PrismaClient } from '../generated/prisma/client';
import type {
  CreateRoomData,
  IRoomRepository,
  RoomDetailRecord,
  RoomMemberRecord,
  RoomMemberStatus,
  RoomMembershipRecord,
  RoomRecord,
  RoomUpdateRecord,
} from '../types/room';

export type RoomTransactionPrisma = {
  room: Pick<PrismaClient['room'], 'create' | 'update'>;
  roomMember: Pick<PrismaClient['roomMember'], 'create' | 'updateMany'>;
  playbackState: Pick<PrismaClient['playbackState'], 'create'>;
};

export type RoomRepositoryPrisma = {
  room: Pick<PrismaClient['room'], 'findUnique' | 'update'>;
  roomMember: Pick<
    PrismaClient['roomMember'],
    'create' | 'findUnique' | 'findMany' | 'update' | 'updateMany'
  >;
  recentRoom: Pick<PrismaClient['recentRoom'], 'upsert'>;
  $transaction: <T>(fn: (tx: RoomTransactionPrisma) => Promise<T>) => Promise<T>;
};

function isUniqueConstraintFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

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

  async findRoomById(roomId: string): Promise<RoomDetailRecord | null> {
    return this.prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        hostId: true,
        status: true,
        inviteCode: true,
        createdAt: true,
      },
    });
  }

  async findRoomByInviteCode(inviteCode: string): Promise<RoomDetailRecord | null> {
    return this.prisma.room.findUnique({
      where: { inviteCode },
      select: {
        id: true,
        name: true,
        hostId: true,
        status: true,
        inviteCode: true,
        createdAt: true,
      },
    });
  }

  async touchLastActivity(roomId: string): Promise<void> {
    await this.prisma.room.update({
      where: { id: roomId },
      data: { lastActivityAt: new Date() },
    });
  }

  async updateRoomName(roomId: string, name: string): Promise<RoomUpdateRecord> {
    return this.prisma.room.update({
      where: { id: roomId },
      data: { name },
      select: { id: true, name: true, status: true, closedAt: true, updatedAt: true },
    });
  }

  async findMembership(roomId: string, userId: string): Promise<RoomMembershipRecord | null> {
    return this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { role: true, status: true },
    });
  }

  async upsertMembership(roomId: string, userId: string): Promise<boolean> {
    const now = new Date();
    try {
      await this.prisma.roomMember.create({
        data: {
          roomId,
          userId,
          role: 'member',
          status: 'offline',
          joinedAt: now,
          lastSeenAt: now,
        },
      });
      return true;
    } catch (error) {
      if (!isUniqueConstraintFailure(error)) {
        throw error;
      }

      await this.prisma.roomMember.update({
        where: { roomId_userId: { roomId, userId } },
        data: {
          status: 'offline',
          lastSeenAt: now,
          leftAt: null,
        },
      });
      return false;
    }
  }

  async findMembers(roomId: string): Promise<RoomMemberRecord[]> {
    const rows = await this.prisma.roomMember.findMany({
      where: { roomId, status: { not: 'left' } },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        user: { select: { nickname: true, profileImage: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      nickname: row.user.nickname,
      profileImage: row.user.profileImage,
      role: row.role,
      status: row.status,
    }));
  }

  async upsertRecentRoom(userId: string, roomId: string): Promise<void> {
    const now = new Date();

    await this.prisma.recentRoom.upsert({
      where: { userId_roomId: { userId, roomId } },
      create: { userId, roomId, lastJoinedAt: now },
      update: { lastJoinedAt: now },
    });
  }

  async updateMemberStatus(
    roomId: string,
    userId: string,
    status: RoomMemberStatus,
    fromStatuses: RoomMemberStatus[],
  ): Promise<boolean> {
    const now = new Date();

    const result = await this.prisma.roomMember.updateMany({
      where: { roomId, userId, status: { in: fromStatuses } },
      data: {
        status,
        lastSeenAt: now,
        ...(status === 'left' ? { leftAt: now } : {}),
      },
    });

    return result.count > 0;
  }

  async findMemberInfo(roomId: string, userId: string): Promise<RoomMemberRecord | null> {
    const row = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        user: { select: { nickname: true, profileImage: true } },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      nickname: row.user.nickname,
      profileImage: row.user.profileImage,
      role: row.role,
      status: row.status,
    };
  }

  async closeRoom(roomId: string): Promise<RoomUpdateRecord> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.update({
        where: { id: roomId },
        data: { status: 'closed', closedAt: now },
        select: { id: true, name: true, status: true, closedAt: true, updatedAt: true },
      });

      await tx.roomMember.updateMany({
        where: { roomId, status: { not: 'left' } },
        data: { status: 'left', leftAt: now, lastSeenAt: now },
      });

      return room;
    });
  }
}
