import { isDriverAdapterError } from '@prisma/driver-adapter-utils';

import { Prisma, type PrismaClient } from '../generated/prisma/client';
import {
  PersonalPlaylistDuplicateVideoError,
  type AddPersonalPlaylistItemData,
  type IPersonalPlaylistRepository,
  type PersonalPlaylistItemRecord,
  type PersonalPlaylistRecord,
  type ReorderPersonalPlaylistItemInput,
} from '../types/personal-playlist';
import type { RefreshedVideoMetadata } from '../types/youtube-metadata';

const PERSONAL_PLAYLIST_SELECT = {
  id: true,
  ownerId: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PERSONAL_PLAYLIST_ITEM_SELECT = {
  id: true,
  personalPlaylistId: true,
  videoId: true,
  title: true,
  channelTitle: true,
  thumbnailUrl: true,
  duration: true,
  position: true,
  status: true,
  addedAt: true,
  metadataRefreshedAt: true,
} as const;

const ADD_ITEM_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 20;

function retryDelayMs(attempt: number): number {
  const backoff = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
  return backoff + Math.random() * backoff;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSerializationFailure(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
    return true;
  }
  return isDriverAdapterError(error) && error.cause.kind === 'TransactionWriteConflict';
}

function isUniqueConstraintFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

type PersonalPlaylistItemTxClient = {
  personalPlaylistItem: Pick<PrismaClient['personalPlaylistItem'], 'aggregate' | 'create'>;
};

export type PersonalPlaylistRepositoryPrisma = {
  personalPlaylist: Pick<
    PrismaClient['personalPlaylist'],
    'findMany' | 'create' | 'findUnique' | 'update' | 'delete' | 'deleteMany'
  >;
  personalPlaylistItem: Pick<
    PrismaClient['personalPlaylistItem'],
    'findMany' | 'findUnique' | 'update' | 'updateMany' | 'delete'
  >;
  $transaction: {
    <T>(operations: Promise<T>[]): Promise<T[]>;
    <T>(
      fn: (tx: PersonalPlaylistItemTxClient) => Promise<T>,
      options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
    ): Promise<T>;
  };
};

export class PersonalPlaylistRepository implements IPersonalPlaylistRepository {
  constructor(private readonly prisma: PersonalPlaylistRepositoryPrisma) {}

  findPlaylistsByOwnerId(ownerId: string): Promise<PersonalPlaylistRecord[]> {
    return this.prisma.personalPlaylist.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      select: PERSONAL_PLAYLIST_SELECT,
    });
  }

  createPlaylist(ownerId: string, name: string): Promise<PersonalPlaylistRecord> {
    return this.prisma.personalPlaylist.create({
      data: { ownerId, name },
      select: PERSONAL_PLAYLIST_SELECT,
    });
  }

  findPlaylistById(playlistId: string): Promise<PersonalPlaylistRecord | null> {
    return this.prisma.personalPlaylist.findUnique({
      where: { id: playlistId },
      select: PERSONAL_PLAYLIST_SELECT,
    });
  }

  updatePlaylistName(playlistId: string, name: string): Promise<PersonalPlaylistRecord> {
    return this.prisma.personalPlaylist.update({
      where: { id: playlistId },
      data: { name },
      select: PERSONAL_PLAYLIST_SELECT,
    });
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await this.prisma.personalPlaylist.delete({ where: { id: playlistId } });
  }

  async deleteAllByOwnerId(ownerId: string): Promise<void> {
    await this.prisma.personalPlaylist.deleteMany({ where: { ownerId } });
  }

  getItems(playlistId: string): Promise<PersonalPlaylistItemRecord[]> {
    return this.prisma.personalPlaylistItem.findMany({
      where: { personalPlaylistId: playlistId },
      orderBy: { position: 'asc' },
      select: PERSONAL_PLAYLIST_ITEM_SELECT,
    });
  }

  addItem(data: AddPersonalPlaylistItemData): Promise<PersonalPlaylistItemRecord> {
    return this.withSerializableRetry((tx) =>
      tx.personalPlaylistItem
        .aggregate({
          where: { personalPlaylistId: data.personalPlaylistId },
          _max: { position: true },
        })
        .then((result) =>
          tx.personalPlaylistItem.create({
            data: (() => {
              const addedAt = new Date();
              return {
                ...data,
                position: (result._max.position ?? 0) + 1,
                status: 'available',
                addedAt,
                metadataRefreshedAt: addedAt,
              };
            })(),
            select: PERSONAL_PLAYLIST_ITEM_SELECT,
          }),
        ),
    );
  }

  findItemByPlaylistAndVideoId(
    playlistId: string,
    videoId: string,
  ): Promise<PersonalPlaylistItemRecord | null> {
    return this.prisma.personalPlaylistItem.findUnique({
      where: { personalPlaylistId_videoId: { personalPlaylistId: playlistId, videoId } },
      select: PERSONAL_PLAYLIST_ITEM_SELECT,
    });
  }

  findItemById(itemId: string): Promise<PersonalPlaylistItemRecord | null> {
    return this.prisma.personalPlaylistItem.findUnique({
      where: { id: itemId },
      select: PERSONAL_PLAYLIST_ITEM_SELECT,
    });
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.prisma.personalPlaylistItem.delete({ where: { id: itemId } });
  }

  async reorderItems(items: ReorderPersonalPlaylistItemInput[]): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.personalPlaylistItem.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );
  }

  findStaleMetadataItems(cutoff: Date): Promise<Array<{ id: string; videoId: string }>> {
    return this.prisma.personalPlaylistItem.findMany({
      where: { metadataRefreshedAt: { lte: cutoff } },
      select: { id: true, videoId: true },
    });
  }

  async applyMetadataRefresh(
    items: Array<{ id: string; result: RefreshedVideoMetadata }>,
  ): Promise<void> {
    const metadataRefreshedAt = new Date();
    await this.prisma.$transaction(
      items.map(({ id, result }) =>
        this.prisma.personalPlaylistItem.updateMany({
          where: { id },
          data:
            result.status === 'available'
              ? { ...result, metadataRefreshedAt }
              : { status: 'unavailable', metadataRefreshedAt },
        }),
      ),
    );
  }

  private async withSerializableRetry<T>(
    fn: (tx: PersonalPlaylistItemTxClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.prisma.$transaction(fn, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (isUniqueConstraintFailure(error)) {
          throw new PersonalPlaylistDuplicateVideoError();
        }
        if (!isSerializationFailure(error) || attempt >= ADD_ITEM_MAX_ATTEMPTS) {
          throw error;
        }
        await sleep(retryDelayMs(attempt));
      }
    }
  }
}
