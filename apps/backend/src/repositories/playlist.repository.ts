import { isDriverAdapterError } from '@prisma/driver-adapter-utils';

import { Prisma, type PrismaClient } from '../generated/prisma/client';
import type { PersonalPlaylistItemRecord } from '../types/personal-playlist';
import {
  PlaylistDuplicateVideoError,
  type AddPlaylistItemData,
  type IPlaylistRepository,
  type ImportPlaylistItemsResult,
  type PlaylistItemLookupRecord,
  type PlaylistItemRecord,
  type ReorderPlaylistItemInput,
} from '../types/playlist';

const PLAYLIST_ITEM_SELECT = {
  id: true,
  videoId: true,
  title: true,
  channelTitle: true,
  thumbnailUrl: true,
  duration: true,
  position: true,
  addedBy: true,
  status: true,
  addedAt: true,
} as const;

// 두 요청이 동시에 같은 Room에 곡을 추가하면 max(position) 조회와 insert 사이에
// 경합이 생겨 동일한 position이 중복 저장될 수 있다. Serializable 격리 수준에서는
// 이런 write skew를 DB가 감지해 한쪽 트랜잭션을 실패시키므로 재시도로 해소한다.
const ADD_ITEM_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 20;

// 재시도 사이에 딜레이 없이 즉시 재시도하면, 동시에 충돌했던 트랜잭션들이 다시 같은
// 타이밍에 재시도하며 또 충돌할 수 있다. 지수 백오프 + 지터로 재시도 시점을 흩어준다.
function retryDelayMs(attempt: number): number {
  const backoff = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
  return backoff + Math.random() * backoff;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// @prisma/adapter-pg(driver adapter) 경로에서는 write conflict가
// PrismaClientKnownRequestError(P2034)로 변환되지 않고 DriverAdapterError로
// 그대로 전달된다 (cause.kind === 'TransactionWriteConflict', Postgres SQLSTATE 40001).
// 두 형태를 모두 확인해야 재시도가 실제로 동작한다.
function isSerializationFailure(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
    return true;
  }
  return isDriverAdapterError(error) && error.cause.kind === 'TransactionWriteConflict';
}

function isUniqueConstraintFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

type PlaylistItemTxClient = {
  playlistItem: Pick<
    PrismaClient['playlistItem'],
    'aggregate' | 'create' | 'findMany' | 'createManyAndReturn'
  >;
};

export type PlaylistRepositoryPrisma = {
  playlistItem: Pick<
    PrismaClient['playlistItem'],
    'findMany' | 'aggregate' | 'create' | 'createManyAndReturn' | 'findUnique' | 'update' | 'delete'
  >;
  $transaction: {
    <T>(operations: Promise<T>[]): Promise<T[]>;
    <T>(
      fn: (tx: PlaylistItemTxClient) => Promise<T>,
      options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
    ): Promise<T>;
  };
};

export class PlaylistRepository implements IPlaylistRepository {
  constructor(private readonly prisma: PlaylistRepositoryPrisma) {}

  getPlaylist(roomId: string): Promise<PlaylistItemRecord[]> {
    return this.prisma.playlistItem.findMany({
      where: { roomId },
      orderBy: { position: 'asc' },
      select: PLAYLIST_ITEM_SELECT,
    });
  }

  addItem(data: AddPlaylistItemData): Promise<PlaylistItemRecord> {
    return this.withSerializableRetry((tx) =>
      tx.playlistItem
        .aggregate({
          where: { roomId: data.roomId },
          _max: { position: true },
        })
        .then((result) =>
          tx.playlistItem.create({
            data: {
              roomId: data.roomId,
              videoId: data.videoId,
              title: data.title,
              channelTitle: data.channelTitle,
              thumbnailUrl: data.thumbnailUrl,
              duration: data.duration,
              position: (result._max.position ?? 0) + 1,
              addedBy: data.addedBy,
              status: 'available',
              addedAt: new Date(),
            },
            select: PLAYLIST_ITEM_SELECT,
          }),
        ),
    );
  }

  private async withSerializableRetry<T>(fn: (tx: PlaylistItemTxClient) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.prisma.$transaction(fn, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (isUniqueConstraintFailure(error)) {
          throw new PlaylistDuplicateVideoError();
        }
        if (!isSerializationFailure(error) || attempt >= ADD_ITEM_MAX_ATTEMPTS) {
          throw error;
        }
        await sleep(retryDelayMs(attempt));
      }
    }
  }

  findItemByRoomAndVideoId(roomId: string, videoId: string): Promise<PlaylistItemRecord | null> {
    return this.prisma.playlistItem.findUnique({
      where: { roomId_videoId: { roomId, videoId } },
      select: PLAYLIST_ITEM_SELECT,
    });
  }

  findItemById(itemId: string): Promise<PlaylistItemLookupRecord | null> {
    return this.prisma.playlistItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        roomId: true,
        videoId: true,
        duration: true,
        position: true,
        addedBy: true,
        status: true,
      },
    });
  }

  async markUnavailable(itemId: string): Promise<void> {
    await this.prisma.playlistItem.update({
      where: { id: itemId },
      data: { status: 'unavailable' },
    });
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.prisma.playlistItem.delete({
      where: { id: itemId },
    });
  }

  async reorderItems(items: ReorderPlaylistItemInput[]): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.playlistItem.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );
  }

  importItems(
    roomId: string,
    sourceItems: PersonalPlaylistItemRecord[],
    addedBy: string,
  ): Promise<ImportPlaylistItemsResult> {
    return this.withSerializableRetry(async (tx) => {
      const existing = await tx.playlistItem.findMany({
        where: { roomId },
        select: { videoId: true },
      });
      const existingVideoIds = new Set(existing.map((item) => item.videoId));
      const unavailableCount = sourceItems.filter((item) => item.status === 'unavailable').length;
      const seenVideoIds = new Set<string>();
      const itemsToInsert: PersonalPlaylistItemRecord[] = [];
      let duplicateCount = 0;

      for (const item of sourceItems) {
        if (item.status === 'unavailable') {
          continue;
        }
        if (existingVideoIds.has(item.videoId) || seenVideoIds.has(item.videoId)) {
          duplicateCount += 1;
          continue;
        }
        seenVideoIds.add(item.videoId);
        itemsToInsert.push(item);
      }

      if (itemsToInsert.length === 0) {
        return { addedItems: [], duplicateCount, unavailableCount };
      }

      const { _max } = await tx.playlistItem.aggregate({
        where: { roomId },
        _max: { position: true },
      });
      let nextPosition = (_max.position ?? 0) + 1;
      const addedItems = await tx.playlistItem.createManyAndReturn({
        data: itemsToInsert.map((item) => ({
          roomId,
          videoId: item.videoId,
          title: item.title,
          channelTitle: item.channelTitle,
          thumbnailUrl: item.thumbnailUrl,
          duration: item.duration,
          position: nextPosition++,
          addedBy,
          status: 'available' as const,
          addedAt: new Date(),
        })),
        select: PLAYLIST_ITEM_SELECT,
      });

      return { addedItems, duplicateCount, unavailableCount };
    });
  }
}
