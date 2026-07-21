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
});
