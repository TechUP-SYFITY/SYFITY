import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { PersonalPlaylistService } from './personal-playlist.service';
import { PersonalPlaylistDuplicateVideoError } from '../types/personal-playlist';

const playlist = {
  id: 'playlist-1',
  ownerId: 'user-1',
  name: 'My songs',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
};
const item = {
  id: 'item-1',
  personalPlaylistId: 'playlist-1',
  videoId: 'video-1',
  title: 'Song',
  channelTitle: 'Channel',
  thumbnailUrl: '',
  duration: 180,
  position: 1,
  status: 'available' as const,
  addedAt: new Date(),
};

function fixture() {
  const repository = {
    findPlaylistsByOwnerId: vi.fn().mockResolvedValue([playlist]),
    createPlaylist: vi.fn().mockResolvedValue(playlist),
    findPlaylistById: vi.fn().mockResolvedValue(playlist),
    updatePlaylistName: vi.fn().mockResolvedValue(playlist),
    deletePlaylist: vi.fn().mockResolvedValue(undefined),
    getItems: vi.fn().mockResolvedValue([item]),
    addItem: vi.fn().mockResolvedValue(item),
    findItemByPlaylistAndVideoId: vi.fn().mockResolvedValue(null),
    findItemById: vi.fn().mockResolvedValue(item),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn().mockResolvedValue(undefined),
    deleteAllByOwnerId: vi.fn().mockResolvedValue(undefined),
    findStaleMetadataItems: vi.fn().mockResolvedValue([]),
    applyMetadataRefresh: vi.fn().mockResolvedValue(undefined),
  };
  const youtubeClient = {
    getVideoDetails: vi.fn().mockResolvedValue([
      {
        videoId: 'video-1',
        title: 'Song',
        channelTitle: 'Channel',
        thumbnailUrl: '',
        duration: 180,
        embeddable: true,
        madeForKids: false,
        categoryId: '10',
      },
    ]),
  };
  const metadataRefreshService = { refreshVideoMetadata: vi.fn() };
  return {
    service: new PersonalPlaylistService(repository, youtubeClient, metadataRefreshService),
    repository,
    youtubeClient,
    metadataRefreshService,
  };
}

describe('PersonalPlaylistService', () => {
  it('목록과 Playlist 생성은 현재 사용자로 Repository를 호출한다', async () => {
    const { service, repository } = fixture();

    await expect(service.getPlaylists('user-1')).resolves.toEqual([playlist]);
    await expect(service.createPlaylist('user-1', 'My songs')).resolves.toEqual(playlist);
    expect(repository.findPlaylistsByOwnerId).toHaveBeenCalledWith('user-1');
    expect(repository.createPlaylist).toHaveBeenCalledWith('user-1', 'My songs');
  });

  it('소유자만 Playlist 상세를 조회한다', async () => {
    const { service, repository } = fixture();

    await expect(service.getPlaylistDetail('playlist-1', 'user-1')).resolves.toEqual({
      playlist,
      items: [item],
    });
    repository.findPlaylistById.mockResolvedValueOnce({ ...playlist, ownerId: 'user-2' });
    await expect(service.getPlaylistDetail('playlist-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.PERSONAL_PLAYLIST_ACCESS_DENIED,
    });
  });

  it('Music 영상만 곡으로 추가한다', async () => {
    const { service, repository, youtubeClient } = fixture();

    await expect(service.addItem('playlist-1', 'user-1', { videoId: 'video-1' })).resolves.toEqual(
      item,
    );
    expect(repository.addItem).toHaveBeenCalledWith({
      personalPlaylistId: 'playlist-1',
      videoId: 'video-1',
      title: 'Song',
      channelTitle: 'Channel',
      thumbnailUrl: '',
      duration: 180,
    });

    youtubeClient.getVideoDetails.mockResolvedValueOnce([
      { ...item, embeddable: true, categoryId: '22' },
    ]);
    await expect(
      service.addItem('playlist-1', 'user-1', { videoId: 'video-2' }),
    ).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.PLAYLIST_NOT_MUSIC,
    });
  });

  it('아동용으로 지정된 영상은 개인 Playlist에 추가하지 않는다', async () => {
    const { service, repository, youtubeClient } = fixture();
    youtubeClient.getVideoDetails.mockResolvedValueOnce([
      { ...item, embeddable: true, madeForKids: true, categoryId: '10' },
    ]);

    await expect(
      service.addItem('playlist-1', 'user-1', { videoId: 'video-1' }),
    ).rejects.toMatchObject({ status: 400, code: ERROR_CODES.PLAYLIST_VIDEO_UNAVAILABLE });
    expect(repository.addItem).not.toHaveBeenCalled();
  });

  it('오래된 메타데이터를 갱신하고 조회 불가 영상은 unavailable로 저장한다', async () => {
    const { service, repository, metadataRefreshService } = fixture();
    const cutoff = new Date('2026-06-01T00:00:00.000Z');
    repository.findStaleMetadataItems.mockResolvedValueOnce([
      { id: 'item-1', videoId: 'video-1' },
      { id: 'item-2', videoId: 'missing-video' },
    ]);
    metadataRefreshService.refreshVideoMetadata.mockResolvedValueOnce(
      new Map([
        [
          'video-1',
          {
            status: 'available',
            title: 'Updated',
            channelTitle: 'Channel',
            thumbnailUrl: 'thumb',
            duration: 200,
          },
        ],
      ]),
    );

    await expect(service.refreshStaleMetadata(cutoff)).resolves.toEqual({
      checkedCount: 2,
      unavailableCount: 1,
    });
    expect(metadataRefreshService.refreshVideoMetadata).toHaveBeenCalledWith([
      'video-1',
      'missing-video',
    ]);
    expect(repository.applyMetadataRefresh).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'item-1',
        result: expect.objectContaining({ status: 'available' }),
      }),
      { id: 'item-2', result: { status: 'unavailable' } },
    ]);
  });

  it('중복 곡과 저장 중 unique 충돌을 PERSONAL_PLAYLIST_DUPLICATE_VIDEO로 거부한다', async () => {
    const { service, repository } = fixture();
    repository.findItemByPlaylistAndVideoId.mockResolvedValueOnce(item);
    await expect(
      service.addItem('playlist-1', 'user-1', { videoId: 'video-1' }),
    ).rejects.toMatchObject({
      status: 409,
      code: ERROR_CODES.PERSONAL_PLAYLIST_DUPLICATE_VIDEO,
    });

    repository.findItemByPlaylistAndVideoId.mockResolvedValueOnce(null);
    repository.addItem.mockRejectedValueOnce(new PersonalPlaylistDuplicateVideoError());
    await expect(
      service.addItem('playlist-1', 'user-1', { videoId: 'video-1' }),
    ).rejects.toMatchObject({
      status: 409,
      code: ERROR_CODES.PERSONAL_PLAYLIST_DUPLICATE_VIDEO,
    });
  });

  it('다른 Playlist의 곡 삭제와 누락 곡 삭제를 거부한다', async () => {
    const { service, repository } = fixture();
    repository.findItemById.mockResolvedValueOnce({ ...item, personalPlaylistId: 'playlist-2' });

    await expect(service.deleteItem('playlist-1', 'user-1', 'item-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PERSONAL_PLAYLIST_ITEM_NOT_FOUND,
    });
  });

  it('순서 변경은 전체 항목 id와 1부터 연속된 position을 요구한다', async () => {
    const { service, repository } = fixture();
    repository.getItems.mockResolvedValueOnce([item, { ...item, id: 'item-2' }]);
    await expect(
      service.reorderItems('playlist-1', 'user-1', [
        { id: 'item-1', position: 1 },
        { id: 'missing', position: 2 },
      ]),
    ).rejects.toMatchObject({ status: 404, code: ERROR_CODES.PERSONAL_PLAYLIST_ITEM_NOT_FOUND });

    repository.getItems.mockResolvedValueOnce([item, { ...item, id: 'item-2' }]);
    await expect(
      service.reorderItems('playlist-1', 'user-1', [
        { id: 'item-1', position: 1 },
        { id: 'item-1', position: 2 },
        { id: 'item-2', position: 3 },
      ]),
    ).rejects.toMatchObject({ status: 404, code: ERROR_CODES.PERSONAL_PLAYLIST_ITEM_NOT_FOUND });
    expect(repository.reorderItems).not.toHaveBeenCalled();

    repository.getItems.mockResolvedValueOnce([item, { ...item, id: 'item-2' }]);
    await expect(
      service.reorderItems('playlist-1', 'user-1', [
        { id: 'item-1', position: 1 },
        { id: 'item-2', position: 3 },
      ]),
    ).rejects.toMatchObject({ status: 400, code: ERROR_CODES.VALIDATION_ERROR });
  });

  it('순서 변경은 1-based position을 저장하고 최신 항목을 반환한다', async () => {
    const { service, repository } = fixture();

    await expect(
      service.reorderItems('playlist-1', 'user-1', [{ id: 'item-1', position: 1 }]),
    ).resolves.toEqual([item]);
    expect(repository.reorderItems).toHaveBeenCalledWith([{ id: 'item-1', position: 1 }]);
  });
});
