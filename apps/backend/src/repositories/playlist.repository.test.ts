import { describe, expect, it, vi } from 'vitest';

import { PlaylistRepository, type PlaylistRepositoryPrisma } from './playlist.repository';
import type {
  AddPlaylistItemData,
  PlaylistItemLookupRecord,
  PlaylistItemRecord,
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
  position: 1,
  addedBy: 'user-1',
};

function makePrisma(
  overrides: {
    findManyResult?: PlaylistItemRecord[];
    maxPosition?: number | null;
    createResult?: PlaylistItemRecord;
    findUniqueResult?: PlaylistItemLookupRecord | null;
  } = {},
): PlaylistRepositoryPrisma {
  return {
    playlistItem: {
      findMany: vi.fn().mockResolvedValue(overrides.findManyResult ?? [playlistItem]),
      aggregate: vi.fn().mockResolvedValue({
        _max: { position: overrides.maxPosition ?? null },
      }),
      create: vi.fn().mockResolvedValue(overrides.createResult ?? playlistItem),
      findUnique: vi.fn().mockResolvedValue(overrides.findUniqueResult ?? null),
      update: vi.fn().mockResolvedValue({}),
    },
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

  it('최대 position이 없으면 null을 반환한다', async () => {
    const prisma = makePrisma({ maxPosition: null });
    const repo = new PlaylistRepository(prisma);

    await expect(repo.getMaxPosition('room-1')).resolves.toBeNull();
    expect(prisma.playlistItem.aggregate).toHaveBeenCalledWith({
      where: { roomId: 'room-1' },
      _max: { position: true },
    });
  });

  it('최대 position을 반환한다', async () => {
    const repo = new PlaylistRepository(makePrisma({ maxPosition: 3 }));

    await expect(repo.getMaxPosition('room-1')).resolves.toBe(3);
  });

  it('곡을 available 상태로 추가한다', async () => {
    const prisma = makePrisma();
    const repo = new PlaylistRepository(prisma);

    await expect(repo.addItem(addItemData)).resolves.toEqual(playlistItem);

    expect(prisma.playlistItem.create).toHaveBeenCalledWith({
      data: {
        ...addItemData,
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

  it('ID로 플레이리스트 항목 조회에 필요한 필드를 조회한다', async () => {
    const item: PlaylistItemLookupRecord = {
      id: 'playlist-item-1',
      roomId: 'room-1',
      videoId: 'video-1',
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
});
