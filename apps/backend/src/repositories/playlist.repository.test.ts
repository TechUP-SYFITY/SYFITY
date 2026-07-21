import { DriverAdapterError } from '@prisma/driver-adapter-utils';
import { describe, expect, it, vi } from 'vitest';

import { PlaylistRepository, type PlaylistRepositoryPrisma } from './playlist.repository';
import { Prisma } from '../generated/prisma/client';
import {
  PlaylistDuplicateVideoError,
  type AddPlaylistItemData,
  type PlaylistItemLookupRecord,
  type PlaylistItemRecord,
} from '../types/playlist';

const playlistItem: PlaylistItemRecord = {
  id: 'playlist-item-1',
  videoId: 'video-1',
  title: 'Song One',
  channelTitle: 'Channel One',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  duration: 180,
  position: 1,
  addedBy: 'user-1',
  status: 'available',
  addedAt: new Date('2026-07-01T12:00:00.000Z'),
};

const addItemData: AddPlaylistItemData = {
  roomId: 'room-1',
  videoId: 'video-1',
  title: 'Song One',
  channelTitle: 'Channel One',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  duration: 180,
  addedBy: 'user-1',
};

const writeConflictError = new Prisma.PrismaClientKnownRequestError(
  'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
  { code: 'P2034', clientVersion: 'test' },
);

const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
  'Unique constraint failed on the fields: (`room_id`,`video_id`)',
  { code: 'P2002', clientVersion: 'test' },
);

// @prisma/adapter-pg(driver adapter) 경로에서 실제로 발생하는 write conflict 형태.
// P2034로 변환되지 않고 DriverAdapterError(cause.kind === 'TransactionWriteConflict')로 전달된다.
const driverAdapterWriteConflictError = new DriverAdapterError({
  kind: 'TransactionWriteConflict',
  originalCode: '40001',
  originalMessage: 'could not serialize access due to read/write dependencies among transactions',
});

function makePrisma(
  overrides: {
    findManyResult?: PlaylistItemRecord[];
    maxPosition?: number | null;
    createResult?: PlaylistItemRecord;
    findUniqueResult?: PlaylistItemLookupRecord | PlaylistItemRecord | null;
    transaction?: PlaylistRepositoryPrisma['$transaction'];
  } = {},
): PlaylistRepositoryPrisma {
  const playlistItemClient = {
    findMany: vi.fn().mockResolvedValue(overrides.findManyResult ?? [playlistItem]),
    aggregate: vi.fn().mockResolvedValue({
      _max: { position: overrides.maxPosition ?? null },
    }),
    create: vi.fn().mockResolvedValue(overrides.createResult ?? playlistItem),
    findUnique: vi.fn().mockResolvedValue(overrides.findUniqueResult ?? null),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };

  const defaultTransaction = vi.fn(async (arg: unknown) => {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    const fn = arg as (tx: { playlistItem: typeof playlistItemClient }) => unknown;
    return fn({ playlistItem: playlistItemClient });
  }) as unknown as PlaylistRepositoryPrisma['$transaction'];

  return {
    playlistItem: playlistItemClient,
    $transaction: overrides.transaction ?? defaultTransaction,
  };
}

describe('PlaylistRepository', () => {
  it('플레이리스트를 position 오름차순으로 조회한다', async () => {
    const prisma = makePrisma({ findManyResult: [playlistItem] });
    const repo = new PlaylistRepository(prisma);

    await expect(repo.getPlaylist('room-1')).resolves.toEqual([playlistItem]);

    expect(prisma.playlistItem.findMany).toHaveBeenCalledWith({
      where: { roomId: 'room-1' },
      orderBy: { position: 'asc' },
      select: {
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
      },
    });
  });

  it('플레이리스트가 비어 있으면 빈 배열을 반환한다', async () => {
    const repo = new PlaylistRepository(makePrisma({ findManyResult: [] }));

    await expect(repo.getPlaylist('room-1')).resolves.toEqual([]);
  });

  it('최대 position이 없으면 position 1로 곡을 추가한다', async () => {
    const prisma = makePrisma({ maxPosition: null });
    const repo = new PlaylistRepository(prisma);

    await expect(repo.addItem(addItemData)).resolves.toEqual(playlistItem);

    expect(prisma.playlistItem.aggregate).toHaveBeenCalledWith({
      where: { roomId: 'room-1' },
      _max: { position: true },
    });
    expect(prisma.playlistItem.create).toHaveBeenCalledWith({
      data: {
        ...addItemData,
        position: 1,
        status: 'available',
        addedAt: expect.any(Date),
      },
      select: {
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
      },
    });
  });

  it('기존 항목이 있으면 최대 position + 1로 추가한다', async () => {
    const prisma = makePrisma({ maxPosition: 3 });
    const repo = new PlaylistRepository(prisma);

    await repo.addItem(addItemData);

    expect(prisma.playlistItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 4 }) }),
    );
  });

  it('곡 추가는 Serializable 격리 수준의 트랜잭션으로 실행한다', async () => {
    const prisma = makePrisma();
    const repo = new PlaylistRepository(prisma);

    await repo.addItem(addItemData);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('동시 추가로 인한 write conflict(P2034)는 재시도 후 성공한다', async () => {
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(writeConflictError)
      .mockResolvedValueOnce(playlistItem);
    const prisma = makePrisma({ transaction });
    const repo = new PlaylistRepository(prisma);

    await expect(repo.addItem(addItemData)).resolves.toEqual(playlistItem);

    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('동시 추가로 인한 write conflict(DriverAdapterError)는 재시도 후 성공한다', async () => {
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(driverAdapterWriteConflictError)
      .mockResolvedValueOnce(playlistItem);
    const prisma = makePrisma({ transaction });
    const repo = new PlaylistRepository(prisma);

    await expect(repo.addItem(addItemData)).resolves.toEqual(playlistItem);

    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('write conflict(P2034)가 재시도 횟수를 초과하면 에러를 던진다', async () => {
    const transaction = vi.fn().mockRejectedValue(writeConflictError);
    const prisma = makePrisma({ transaction });
    const repo = new PlaylistRepository(prisma);

    await expect(repo.addItem(addItemData)).rejects.toBe(writeConflictError);

    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('write conflict가 아닌 에러는 재시도하지 않는다', async () => {
    const otherError = new Error('연결 실패');
    const transaction = vi.fn().mockRejectedValue(otherError);
    const prisma = makePrisma({ transaction });
    const repo = new PlaylistRepository(prisma);

    await expect(repo.addItem(addItemData)).rejects.toBe(otherError);

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('동일 Room videoId unique 제약 충돌은 중복 곡 오류로 변환한다', async () => {
    const transaction = vi.fn().mockRejectedValue(uniqueConstraintError);
    const repo = new PlaylistRepository(makePrisma({ transaction }));

    await expect(repo.addItem(addItemData)).rejects.toBeInstanceOf(PlaylistDuplicateVideoError);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('Room과 videoId로 기존 플레이리스트 곡을 조회한다', async () => {
    const prisma = makePrisma({ findUniqueResult: playlistItem });
    const repo = new PlaylistRepository(prisma);

    await expect(repo.findItemByRoomAndVideoId('room-1', 'video-1')).resolves.toEqual(playlistItem);

    expect(prisma.playlistItem.findUnique).toHaveBeenCalledWith({
      where: { roomId_videoId: { roomId: 'room-1', videoId: 'video-1' } },
      select: {
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
      },
    });
  });

  it('ID로 플레이리스트 항목 조회에 필요한 필드를 조회한다', async () => {
    const item: PlaylistItemLookupRecord = {
      id: 'playlist-item-1',
      roomId: 'room-1',
      videoId: 'video-1',
      duration: 180,
      position: 1,
      addedBy: 'user-1',
      status: 'available',
    };
    const prisma = makePrisma({ findUniqueResult: item });
    const repo = new PlaylistRepository(prisma);

    await expect(repo.findItemById('playlist-item-1')).resolves.toEqual(item);

    expect(prisma.playlistItem.findUnique).toHaveBeenCalledWith({
      where: { id: 'playlist-item-1' },
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
  });

  it('플레이리스트 항목이 없으면 null을 반환한다', async () => {
    const repo = new PlaylistRepository(makePrisma({ findUniqueResult: null }));

    await expect(repo.findItemById('playlist-item-1')).resolves.toBeNull();
  });

  it('플레이리스트 항목을 unavailable로 마킹한다', async () => {
    const prisma = makePrisma();
    const repo = new PlaylistRepository(prisma);

    await expect(repo.markUnavailable('playlist-item-1')).resolves.toBeUndefined();

    expect(prisma.playlistItem.update).toHaveBeenCalledWith({
      where: { id: 'playlist-item-1' },
      data: { status: 'unavailable' },
    });
  });

  it('플레이리스트 항목을 삭제한다', async () => {
    const prisma = makePrisma();
    const repo = new PlaylistRepository(prisma);

    await expect(repo.deleteItem('playlist-item-1')).resolves.toBeUndefined();

    expect(prisma.playlistItem.delete).toHaveBeenCalledWith({
      where: { id: 'playlist-item-1' },
    });
  });

  it('플레이리스트 항목 position을 트랜잭션으로 일괄 변경한다', async () => {
    const prisma = makePrisma();
    const repo = new PlaylistRepository(prisma);

    await expect(
      repo.reorderItems([
        { id: 'playlist-item-1', position: 2 },
        { id: 'playlist-item-2', position: 1 },
      ]),
    ).resolves.toBeUndefined();

    expect(prisma.playlistItem.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'playlist-item-1' },
      data: { position: 2 },
    });
    expect(prisma.playlistItem.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'playlist-item-2' },
      data: { position: 1 },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([expect.any(Promise), expect.any(Promise)]);
  });

  it('빈 배열도 트랜잭션에 그대로 전달한다', async () => {
    const prisma = makePrisma();
    const repo = new PlaylistRepository(prisma);

    await expect(repo.reorderItems([])).resolves.toBeUndefined();

    expect(prisma.playlistItem.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith([]);
  });
});
