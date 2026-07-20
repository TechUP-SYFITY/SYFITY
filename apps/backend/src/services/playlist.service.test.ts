import { describe, expect, it, vi } from 'vitest';

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

function fixture() {
  const playlistRepo = {
    getPlaylist: vi.fn().mockResolvedValue([item]),
    addItem: vi.fn().mockResolvedValue(item),
    findItemByRoomAndVideoId: vi.fn().mockResolvedValue(null),
    findItemById: vi.fn().mockResolvedValue(item),
    markUnavailable: vi.fn(),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn(),
  };
  const roomRepo = {
    findRoomById: vi.fn().mockResolvedValue({ id: 'room-1', hostId: 'host', status: 'active' }),
    findMembership: vi.fn().mockResolvedValue({ role: 'host', status: 'online' }),
    touchLastActivity: vi.fn().mockResolvedValue(undefined),
  };
  const playbackService = {
    enqueueIfShuffled: vi.fn().mockResolvedValue(undefined),
    removeFromQueue: vi.fn(),
    advanceAfterCurrentRemoved: vi.fn().mockResolvedValue(null),
  };
  const service = new PlaylistService(
    playlistRepo,
    roomRepo,
    { getVideoDetails: vi.fn().mockResolvedValue([{ ...item, embeddable: true }]) },
    playbackService,
  );
  return { service, playbackService, playlistRepo };
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
});
