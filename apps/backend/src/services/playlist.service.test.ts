import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { PlaylistService } from './playlist.service';

vi.mock('../socket/broadcast', () => ({ broadcastToRoom: vi.fn() }));

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
    getVideoDetails: vi.fn().mockResolvedValue([{ ...item, embeddable: true, categoryId: '10' }]),
  };
  const personalPlaylistRepo = {
    findPlaylistById: vi.fn().mockResolvedValue({ id: 'personal-1', ownerId: 'host' }),
    getItems: vi.fn().mockResolvedValue([]),
  };
  const service = new PlaylistService(
    playlistRepo,
    roomRepo,
    youtubeClient,
    playbackService,
    personalPlaylistRepo,
  );
  return { service, playbackService, playlistRepo, roomRepo, youtubeClient, personalPlaylistRepo };
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

  it.each([{}, { videoId: 'video-1', youtubeUrl: 'https://youtu.be/video-1' }])(
    'videoId와 youtubeUrl이 정확히 하나가 아니면 VALIDATION_ERROR를 던진다',
    async (request) => {
      const { service } = fixture();

      await expect(service.addItem('room-1', 'host', request)).rejects.toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR',
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
      code: 'PLAYLIST_NOT_MUSIC',
    });
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
  });
});
