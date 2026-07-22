import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { PlaylistService } from './playlist.service';
import { broadcastToRoom } from '../socket/broadcast';
import { PlaylistDuplicateVideoError } from '../types/playlist';

vi.mock('../socket/broadcast', () => ({ broadcastToRoom: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

const item = {
  id: 'item-1',
  roomId: 'room-1',
  videoId: 'video-1',
  title: 'Song',
  channelTitle: 'Channel',
  thumbnailUrl: '',
  duration: 180,
  position: 1,
  addedBy: 'host',
  status: 'available' as const,
  addedAt: new Date(),
};

function fixture(status: 'active' | 'closed' | 'inactive' = 'active') {
  const playlistRepo = {
    getPlaylist: vi.fn().mockResolvedValue([item]),
    addItem: vi.fn().mockResolvedValue(item),
    findItemByRoomAndVideoId: vi.fn().mockResolvedValue(null),
    findItemById: vi.fn().mockResolvedValue(item),
    markUnavailable: vi.fn(),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn(),
    importItems: vi.fn().mockResolvedValue({
      addedItems: [],
      duplicateCount: 0,
      unavailableCount: 0,
    }),
    findStaleMetadataItems: vi.fn().mockResolvedValue([]),
    applyMetadataRefresh: vi.fn().mockResolvedValue(undefined),
  };
  const roomRepo = {
    findRoomById: vi.fn().mockResolvedValue({ id: 'room-1', hostId: 'host', status }),
    findMembership: vi.fn().mockResolvedValue({ role: 'host', status: 'online' }),
  };
  const playbackService = {
    enqueueIfShuffled: vi.fn().mockResolvedValue(undefined),
    advanceAfterCurrentRemoved: vi.fn().mockResolvedValue(null),
  };
  const youtubeClient = {
    getVideoDetails: vi
      .fn()
      .mockResolvedValue([{ ...item, embeddable: true, madeForKids: false, categoryId: '10' }]),
  };
  const personalPlaylistRepo = {
    findPlaylistById: vi.fn().mockResolvedValue({ id: 'personal-1', ownerId: 'host' }),
    getItems: vi.fn().mockResolvedValue([]),
  };
  const metadataRefreshService = { refreshVideoMetadata: vi.fn() };
  const service = new PlaylistService(
    playlistRepo,
    roomRepo,
    youtubeClient,
    playbackService,
    personalPlaylistRepo,
    metadataRefreshService,
  );
  return {
    service,
    playbackService,
    playlistRepo,
    roomRepo,
    youtubeClient,
    personalPlaylistRepo,
    metadataRefreshService,
  };
}

describe('PlaylistService playback integration', () => {
  it('곡 추가 뒤 셔플 큐 삽입을 요청한다', async () => {
    const { service, playbackService } = fixture();
    await service.addItem('room-1', 'host', { videoId: 'video-1' });
    expect(playbackService.enqueueIfShuffled).toHaveBeenCalledWith('room-1', 'item-1');
  });

  it('현재 곡 삭제는 PlaybackService에 정책 기반 전환을 위임한다', async () => {
    const { service, playbackService, playlistRepo } = fixture();
    await service.deleteItem('room-1', 'host', 'item-1');
    expect(playbackService.advanceAfterCurrentRemoved).toHaveBeenCalledWith('room-1', 'item-1');
    expect(playlistRepo.deleteItem).toHaveBeenCalledWith('item-1');
  });

  it.each(['closed', 'inactive'] as const)(
    '%s Room Playlist 변경은 ROOM_NOT_ACTIVE를 반환한다',
    async (status) => {
      const { service, playlistRepo } = fixture(status);

      await expect(service.addItem('room-1', 'host', { videoId: 'video-1' })).rejects.toMatchObject(
        {
          status: 409,
          code: ERROR_CODES.ROOM_NOT_ACTIVE,
        },
      );
      expect(playlistRepo.addItem).not.toHaveBeenCalled();
    },
  );

  it('Room Playlist 순서 변경은 모든 항목 id와 1부터 연속된 position을 요구한다', async () => {
    const { service, playlistRepo } = fixture();
    const secondItem = { ...item, id: 'item-2', position: 2 };
    playlistRepo.getPlaylist.mockResolvedValueOnce([item, secondItem]);

    await expect(
      service.reorderPlaylist('room-1', 'host', [
        { id: 'item-1', position: 1 },
        { id: 'item-1', position: 2 },
        { id: 'item-2', position: 3 },
      ]),
    ).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND,
    });
    expect(playlistRepo.reorderItems).not.toHaveBeenCalled();

    playlistRepo.getPlaylist.mockResolvedValueOnce([item, secondItem]);
    await expect(
      service.reorderPlaylist('room-1', 'host', [
        { id: 'item-1', position: 1 },
        { id: 'item-2', position: 3 },
      ]),
    ).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
    });
    expect(playlistRepo.reorderItems).not.toHaveBeenCalled();
  });

  it('Room Playlist 순서 변경은 1-based position을 저장하고 갱신을 전파한다', async () => {
    const { service, playlistRepo } = fixture();

    await service.reorderPlaylist('room-1', 'host', [{ id: 'item-1', position: 1 }]);

    expect(playlistRepo.reorderItems).toHaveBeenCalledWith([{ id: 'item-1', position: 1 }]);
    expect(broadcastToRoom).toHaveBeenCalledWith('room-1', 'playlist:updated', {
      playlist: [expect.objectContaining({ id: 'item-1', position: 1 })],
    });
  });

  it.each([{}, { videoId: 'video-1', youtubeUrl: 'https://youtu.be/video-1' }])(
    'videoId와 youtubeUrl이 정확히 하나가 아니면 VALIDATION_ERROR를 던진다',
    async (request) => {
      const { service } = fixture();

      await expect(service.addItem('room-1', 'host', request)).rejects.toMatchObject({
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
      });
    },
  );

  it('Music 카테고리가 아닌 영상은 Room Playlist에 추가하지 않는다', async () => {
    const { service, youtubeClient } = fixture();
    youtubeClient.getVideoDetails.mockResolvedValueOnce([
      { ...item, embeddable: true, categoryId: '22' },
    ]);

    await expect(service.addItem('room-1', 'host', { videoId: 'video-1' })).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.PLAYLIST_NOT_MUSIC,
    });
  });

  it('아동용으로 지정된 영상은 Room Playlist에 추가하지 않는다', async () => {
    const { service, youtubeClient, playlistRepo } = fixture();
    youtubeClient.getVideoDetails.mockResolvedValueOnce([
      { ...item, embeddable: true, madeForKids: true, categoryId: '10' },
    ]);

    await expect(service.addItem('room-1', 'host', { videoId: 'video-1' })).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.PLAYLIST_VIDEO_UNAVAILABLE,
    });
    expect(playlistRepo.addItem).not.toHaveBeenCalled();
  });

  it('오래된 메타데이터를 영상별 한 번만 갱신하고 누락 영상은 unavailable로 처리한다', async () => {
    const { service, playlistRepo, metadataRefreshService } = fixture();
    const cutoff = new Date('2026-06-01T00:00:00.000Z');
    playlistRepo.findStaleMetadataItems.mockResolvedValueOnce([
      { id: 'item-1', videoId: 'video-1' },
      { id: 'item-2', videoId: 'video-1' },
      { id: 'item-3', videoId: 'missing-video' },
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
      checkedCount: 3,
      unavailableCount: 1,
    });
    expect(metadataRefreshService.refreshVideoMetadata).toHaveBeenCalledWith([
      'video-1',
      'missing-video',
    ]);
    expect(playlistRepo.applyMetadataRefresh).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'item-1',
        result: expect.objectContaining({ status: 'available' }),
      }),
      expect.objectContaining({
        id: 'item-2',
        result: expect.objectContaining({ status: 'available' }),
      }),
      { id: 'item-3', result: { status: 'unavailable' } },
    ]);
  });

  it('Host가 자신의 개인 Playlist를 가져오면 YouTube 재검증 없이 큐와 Playlist를 갱신한다', async () => {
    const { service, playlistRepo, playbackService, youtubeClient, personalPlaylistRepo } =
      fixture();
    const imported = { ...item, id: 'item-2', videoId: 'video-2' };
    playlistRepo.importItems.mockResolvedValueOnce({
      addedItems: [imported],
      duplicateCount: 1,
      unavailableCount: 0,
    });
    personalPlaylistRepo.getItems.mockResolvedValueOnce([
      { ...imported, personalPlaylistId: 'personal-1' },
    ]);

    await expect(
      service.importFromPersonalPlaylist('room-1', 'host', 'personal-1'),
    ).resolves.toEqual({
      addedCount: 1,
      duplicateCount: 1,
      unavailableCount: 0,
    });
    expect(youtubeClient.getVideoDetails).not.toHaveBeenCalled();
    expect(playbackService.enqueueIfShuffled).toHaveBeenCalledWith('room-1', 'item-2');
    expect(broadcastToRoom).toHaveBeenCalledOnce();
    expect(broadcastToRoom).toHaveBeenCalledWith('room-1', 'playlist:updated', {
      playlist: [
        {
          id: 'item-1',
          videoId: 'video-1',
          title: 'Song',
          channelTitle: 'Channel',
          thumbnailUrl: '',
          duration: 180,
          position: 1,
          addedBy: 'host',
          status: 'available',
        },
      ],
    });
  });

  it('추가할 곡이 없어도 playlist:updated broadcast를 수행한다', async () => {
    const { service, playlistRepo } = fixture();
    playlistRepo.importItems.mockResolvedValueOnce({
      addedItems: [],
      duplicateCount: 2,
      unavailableCount: 0,
    });

    await expect(
      service.importFromPersonalPlaylist('room-1', 'host', 'personal-1'),
    ).resolves.toEqual({
      addedCount: 0,
      duplicateCount: 2,
      unavailableCount: 0,
    });
    expect(broadcastToRoom).toHaveBeenCalledOnce();
    expect(broadcastToRoom).toHaveBeenCalledWith('room-1', 'playlist:updated', {
      playlist: expect.any(Array),
    });
  });

  it('가져오기 재시도 소진 뒤 unique 충돌은 PLAYLIST_DUPLICATE_VIDEO으로 변환한다', async () => {
    const { service, playlistRepo } = fixture();
    playlistRepo.importItems.mockRejectedValueOnce(new PlaylistDuplicateVideoError());

    await expect(
      service.importFromPersonalPlaylist('room-1', 'host', 'personal-1'),
    ).rejects.toMatchObject({
      status: 409,
      code: ERROR_CODES.PLAYLIST_DUPLICATE_VIDEO,
    });
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'Host가 아닌 사용자',
      userId: 'member',
      playlist: { id: 'personal-1', ownerId: 'member' },
      code: ERROR_CODES.AUTH_FORBIDDEN,
      status: 403,
    },
    {
      label: '존재하지 않는 개인 Playlist',
      userId: 'host',
      playlist: null,
      code: ERROR_CODES.PERSONAL_PLAYLIST_NOT_FOUND,
      status: 404,
    },
    {
      label: '다른 사용자의 개인 Playlist',
      userId: 'host',
      playlist: { id: 'personal-1', ownerId: 'other-user' },
      code: ERROR_CODES.PERSONAL_PLAYLIST_ACCESS_DENIED,
      status: 403,
    },
  ])('$label 가져오기를 거부한다', async ({ userId, playlist, code, status }) => {
    const { service, playlistRepo, personalPlaylistRepo } = fixture();
    personalPlaylistRepo.findPlaylistById.mockResolvedValueOnce(playlist);

    await expect(
      service.importFromPersonalPlaylist('room-1', userId, 'personal-1'),
    ).rejects.toMatchObject({
      status,
      code,
    });
    expect(playlistRepo.importItems).not.toHaveBeenCalled();
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });
});
