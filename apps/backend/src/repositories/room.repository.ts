import type { PrismaClient } from '../generated/prisma/client';
import type {
  CreateRoomData,
  IRoomRepository,
  PlaybackStateRecord,
  RoomDetailRecord,
  RoomMemberRecord,
  RoomMemberStatus,
  RoomMembershipRecord,
  RoomRecord,
} from '../types/room';

export type RoomTransactionPrisma = {
  room: Pick<PrismaClient['room'], 'create' | 'update'>;
  roomMember: Pick<PrismaClient['roomMember'], 'create' | 'updateMany'>;
  playbackState: Pick<PrismaClient['playbackState'], 'create'>;
};

export type RoomRepositoryPrisma = {
  room: Pick<PrismaClient['room'], 'findUnique' | 'update'>;
  roomMember: Pick<PrismaClient['roomMember'], 'findUnique' | 'findMany' | 'upsert' | 'update'>;
  recentRoom: Pick<PrismaClient['recentRoom'], 'upsert'>;
  playbackState: Pick<PrismaClient['playbackState'], 'findUnique'>;
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

  async findMembership(roomId: string, userId: string): Promise<RoomMembershipRecord | null> {
    return this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { role: true, status: true },
    });
  }

  async upsertMembership(roomId: string, userId: string): Promise<void> {
    const now = new Date();

    await this.prisma.roomMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: {
        roomId,
        userId,
        role: 'member',
        status: 'offline',
        joinedAt: now,
        lastSeenAt: now,
      },
      update: {
        status: 'offline',
        lastSeenAt: now,
        leftAt: null,
      },
    });
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

  async findPlaybackState(roomId: string): Promise<PlaybackStateRecord | null> {
    return this.prisma.playbackState.findUnique({
      where: { roomId },
      select: {
        videoId: true,
        playlistItemId: true,
        baseCurrentTime: true,
        isPlaying: true,
        serverStartedAt: true,
        serverPausedAt: true,
        updatedAt: true,
      },
    });
  }

  async updateMemberStatus(
    roomId: string,
    userId: string,
    status: RoomMemberStatus,
  ): Promise<void> {
    const now = new Date();

    await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: {
        status,
        lastSeenAt: now,
        ...(status === 'left' ? { leftAt: now } : {}),
      },
    });
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

  async closeRoom(roomId: string): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.room.update({
        where: { id: roomId },
        data: { status: 'closed', closedAt: now },
      });

      await tx.roomMember.updateMany({
        where: { roomId, status: { not: 'left' } },
        data: { status: 'left', leftAt: now, lastSeenAt: now },
      });
    });
  }
}
