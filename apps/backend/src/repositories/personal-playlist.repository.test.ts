import { describe, expect, it, vi } from 'vitest';

import {
  PersonalPlaylistRepository,
  type PersonalPlaylistRepositoryPrisma,
} from './personal-playlist.repository';
import { Prisma } from '../generated/prisma/client';
import {
  PersonalPlaylistDuplicateVideoError,
  type PersonalPlaylistItemRecord,
  type PersonalPlaylistRecord,
} from '../types/personal-playlist';

const playlist: PersonalPlaylistRecord = {
  id: 'playlist-1',
  ownerId: 'user-1',
  name: 'My songs',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-02T00:00:00.000Z'),
};
const item: PersonalPlaylistItemRecord = {
  id: 'item-1',
  personalPlaylistId: 'playlist-1',
  videoId: 'video-1',
  title: 'Song',
  channelTitle: 'Channel',
  thumbnailUrl: '',
  duration: 180,
  position: 1,
  status: 'available',
  addedAt: new Date('2026-07-01T00:00:00.000Z'),
};

function makePrisma(
  overrides: {
    playlistResult?: PersonalPlaylistRecord | null;
    itemsResult?: PersonalPlaylistItemRecord[];
    itemResult?: PersonalPlaylistItemRecord | null;
    transaction?: PersonalPlaylistRepositoryPrisma['$transaction'];
  } = {},
): PersonalPlaylistRepositoryPrisma {
  const itemClient = {
    findMany: vi.fn().mockResolvedValue(overrides.itemsResult ?? [item]),
    findUnique: vi.fn().mockResolvedValue(overrides.itemResult ?? item),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    aggregate: vi.fn().mockResolvedValue({ _max: { position: null } }),
    create: vi.fn().mockResolvedValue(item),
  };
  const playlistClient = {
    findMany: vi.fn().mockResolvedValue([playlist]),
    create: vi.fn().mockResolvedValue(playlist),
    findUnique: vi.fn().mockResolvedValue(overrides.playlistResult ?? playlist),
    update: vi.fn().mockResolvedValue(playlist),
    delete: vi.fn().mockResolvedValue({}),
  };
  const transaction =
    overrides.transaction ??
    (vi.fn(async (argument: unknown) => {
      if (Array.isArray(argument)) {
        return Promise.all(argument);
      }
      return (argument as (tx: { personalPlaylistItem: typeof itemClient }) => unknown)({
        personalPlaylistItem: itemClient,
      });
    }) as unknown as PersonalPlaylistRepositoryPrisma['$transaction']);

  return {
    personalPlaylist: playlistClient,
    personalPlaylistItem: itemClient,
    $transaction: transaction,
  };
}

describe('PersonalPlaylistRepository', () => {
  it('소유자 기준으로 최근 수정된 Playlist 목록을 조회한다', async () => {
    const prisma = makePrisma();
    const repository = new PersonalPlaylistRepository(prisma);

    await expect(repository.findPlaylistsByOwnerId('user-1')).resolves.toEqual([playlist]);
    expect(prisma.personalPlaylist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'user-1' }, orderBy: { updatedAt: 'desc' } }),
    );
  });

  it('Playlist를 생성·조회·이름 변경한다', async () => {
    const prisma = makePrisma();
    const repository = new PersonalPlaylistRepository(prisma);

    await expect(repository.createPlaylist('user-1', 'New songs')).resolves.toEqual(playlist);
    await expect(repository.findPlaylistById('playlist-1')).resolves.toEqual(playlist);
    await expect(repository.updatePlaylistName('playlist-1', 'Renamed')).resolves.toEqual(playlist);

    expect(prisma.personalPlaylist.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ownerId: 'user-1', name: 'New songs' } }),
    );
    expect(prisma.personalPlaylist.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'playlist-1' } }),
    );
    expect(prisma.personalPlaylist.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'playlist-1' }, data: { name: 'Renamed' } }),
    );
  });

  it('Playlist 삭제는 cascade에 맡겨 단일 delete만 수행한다', async () => {
    const prisma = makePrisma();
    const repository = new PersonalPlaylistRepository(prisma);

    await repository.deletePlaylist('playlist-1');
    expect(prisma.personalPlaylist.delete).toHaveBeenCalledWith({ where: { id: 'playlist-1' } });
    expect(prisma.personalPlaylistItem.delete).not.toHaveBeenCalled();
  });

  it('새 곡은 Serializable 트랜잭션에서 마지막 position 뒤에 추가한다', async () => {
    const prisma = makePrisma();
    const repository = new PersonalPlaylistRepository(prisma);

    await expect(
      repository.addItem({
        personalPlaylistId: 'playlist-1',
        videoId: 'video-1',
        title: 'Song',
        channelTitle: 'Channel',
        thumbnailUrl: '',
        duration: 180,
      }),
    ).resolves.toEqual(item);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('unique 제약 충돌을 개인 Playlist 중복 오류로 변환한다', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
    });
    const transaction = vi
      .fn()
      .mockRejectedValue(error) as PersonalPlaylistRepositoryPrisma['$transaction'];
    const repository = new PersonalPlaylistRepository(makePrisma({ transaction }));

    await expect(
      repository.addItem({
        personalPlaylistId: 'playlist-1',
        videoId: 'video-1',
        title: 'Song',
        channelTitle: 'Channel',
        thumbnailUrl: '',
        duration: 180,
      }),
    ).rejects.toBeInstanceOf(PersonalPlaylistDuplicateVideoError);
  });

  it('곡을 조회·삭제하고 순서를 트랜잭션으로 갱신한다', async () => {
    const prisma = makePrisma();
    const repository = new PersonalPlaylistRepository(prisma);

    await expect(repository.getItems('playlist-1')).resolves.toEqual([item]);
    await expect(repository.findItemByPlaylistAndVideoId('playlist-1', 'video-1')).resolves.toEqual(
      item,
    );
    await expect(repository.findItemById('item-1')).resolves.toEqual(item);
    await repository.deleteItem('item-1');
    await repository.reorderItems([
      { id: 'item-1', position: 1 },
      { id: 'item-2', position: 0 },
    ]);

    expect(prisma.personalPlaylistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { personalPlaylistId: 'playlist-1' },
        orderBy: { position: 'asc' },
      }),
    );
    expect(prisma.personalPlaylistItem.findUnique).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          personalPlaylistId_videoId: { personalPlaylistId: 'playlist-1', videoId: 'video-1' },
        },
      }),
    );
    expect(prisma.personalPlaylistItem.findUnique).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { id: 'item-1' } }),
    );
    expect(prisma.personalPlaylistItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
    expect(prisma.personalPlaylistItem.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'item-1' },
      data: { position: 1 },
    });
    expect(prisma.personalPlaylistItem.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'item-2' },
      data: { position: 0 },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([expect.any(Promise), expect.any(Promise)]);
  });
});
