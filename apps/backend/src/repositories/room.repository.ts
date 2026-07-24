import { Prisma, type PrismaClient } from '../generated/prisma/client';
import type {
  CreateRoomData,
  IRoomRepository,
  KickedMemberRecord,
  RoomDetailRecord,
  RoomMemberLookupRecord,
  RoomMemberRecord,
  RoomMemberStatus,
  RoomMembershipRecord,
  RoomMineRecord,
  RoomRecord,
  RoomUpdateRecord,
} from '../types/room';

export type RoomTransactionPrisma = {
  chatMessage: Pick<PrismaClient['chatMessage'], 'deleteMany'>;
  room: Pick<PrismaClient['room'], 'create' | 'update'>;
  roomMember: Pick<PrismaClient['roomMember'], 'create' | 'updateMany'>;
  playlistItem: Pick<PrismaClient['playlistItem'], 'deleteMany'>;
};

export type RoomRepositoryPrisma = {
  room: Pick<PrismaClient['room'], 'findMany' | 'findUnique' | 'update' | 'updateMany'>;
  roomMember: Pick<
    PrismaClient['roomMember'],
    'create' | 'findFirst' | 'findUnique' | 'findMany' | 'update' | 'updateMany'
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
        closedAt: true,
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
        closedAt: true,
        createdAt: true,
      },
    });
  }

  async findRoomsByHostId(hostId: string): Promise<RoomMineRecord[]> {
    const rooms = await this.prisma.room.findMany({
      where: { hostId, status: { in: ['active', 'closed'] } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, status: true, closedAt: true, updatedAt: true },
    });
    return rooms.map((room) => ({
      ...room,
      status: room.status === 'active' ? 'active' : 'closed',
    }));
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
      where: { roomId, status: { notIn: ['left', 'kicked'] } },
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
      status: row.status as RoomMemberRecord['status'],
    }));
  }

  async findMemberById(roomId: string, memberId: string): Promise<RoomMemberLookupRecord | null> {
    const row = await this.prisma.roomMember.findFirst({
      where: { id: memberId, roomId },
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

  async updateMemberStatusByMemberId(
    roomId: string,
    memberId: string,
    status: RoomMemberStatus,
    fromStatuses: RoomMemberStatus[],
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.roomMember.updateMany({
      where: { id: memberId, roomId, status: { in: fromStatuses } },
      data: {
        status,
        lastSeenAt: now,
        ...(status === 'left' ? { leftAt: now } : {}),
      },
    });

    return result.count > 0;
  }

  async findKickedMembers(roomId: string): Promise<KickedMemberRecord[]> {
    const rows = await this.prisma.roomMember.findMany({
      where: { roomId, status: 'kicked' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        updatedAt: true,
        user: { select: { nickname: true, profileImage: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      nickname: row.user.nickname,
      profileImage: row.user.profileImage,
      kickedAt: row.updatedAt,
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
      status: row.status as RoomMemberRecord['status'],
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

      return room;
    });
  }

  async recoverRoom(roomId: string): Promise<RoomUpdateRecord> {
    return this.prisma.$transaction(async (tx) => {
      await tx.playlistItem.deleteMany({ where: { roomId } });
      await tx.chatMessage.deleteMany({ where: { roomId } });
      return tx.room.update({
        where: { id: roomId },
        data: { status: 'active', closedAt: null },
        select: { id: true, name: true, status: true, closedAt: true, updatedAt: true },
      });
    });
  }

  async deactivateRoom(roomId: string): Promise<void> {
    await this.prisma.room.update({ where: { id: roomId }, data: { status: 'inactive' } });
  }

  async inactivateStaleRooms(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.room.updateMany({
      where: { status: 'closed', closedAt: { lte: cutoff } },
      data: { status: 'inactive' },
    });
    return result.count;
  }
}
