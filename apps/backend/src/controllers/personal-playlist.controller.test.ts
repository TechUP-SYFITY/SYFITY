import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { PersonalPlaylistController } from './personal-playlist.controller';

const playlist = {
  id: 'playlist-1',
  ownerId: 'user-1',
  name: 'My songs',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-02T00:00:00.000Z'),
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

function request(): ExRequest {
  return { user: { id: 'user-1', email: 'user@example.com' } } as ExRequest;
}

function serviceFixture() {
  return {
    getPlaylists: vi.fn().mockResolvedValue([playlist]),
    createPlaylist: vi.fn().mockResolvedValue(playlist),
    getPlaylistDetail: vi.fn().mockResolvedValue({ playlist, items: [item] }),
    renamePlaylist: vi.fn().mockResolvedValue(playlist),
    deletePlaylist: vi.fn().mockResolvedValue(undefined),
    addItem: vi.fn().mockResolvedValue(item),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn().mockResolvedValue([item]),
  };
}

describe('PersonalPlaylistController', () => {
  it('목록과 상세 응답에서 날짜를 ISO 문자열로 직렬화한다', async () => {
    const service = serviceFixture();
    const controller = new PersonalPlaylistController(service);

    await expect(controller.getPlaylists(request())).resolves.toEqual({
      success: true,
      data: {
        playlists: [
          {
            id: 'playlist-1',
            name: 'My songs',
            createdAt: '2026-07-01T00:00:00.000Z',
            updatedAt: '2026-07-02T00:00:00.000Z',
          },
        ],
      },
    });
    await expect(controller.getPlaylistDetail('playlist-1', request())).resolves.toMatchObject({
      success: true,
      data: { playlist: { id: 'playlist-1' }, items: [{ id: 'item-1', videoId: 'video-1' }] },
    });
  });

  it('생성, 이름 변경, 곡 추가와 순서 변경 요청을 Service에 전달한다', async () => {
    const service = serviceFixture();
    const controller = new PersonalPlaylistController(service);

    await controller.createPlaylist(request(), { name: 'New songs' });
    await controller.renamePlaylist('playlist-1', request(), { name: 'Renamed' });
    await controller.addItem('playlist-1', request(), { videoId: 'video-1' });
    await controller.reorderItems('playlist-1', request(), {
      items: [{ id: 'item-1', position: 0 }],
    });

    expect(service.createPlaylist).toHaveBeenCalledWith('user-1', 'New songs');
    expect(service.renamePlaylist).toHaveBeenCalledWith('playlist-1', 'user-1', 'Renamed');
    expect(service.addItem).toHaveBeenCalledWith('playlist-1', 'user-1', { videoId: 'video-1' });
    expect(service.reorderItems).toHaveBeenCalledWith('playlist-1', 'user-1', [
      { id: 'item-1', position: 0 },
    ]);
  });

  it('삭제 요청과 Service 오류를 전달한다', async () => {
    const service = serviceFixture();
    const controller = new PersonalPlaylistController(service);
    await controller.deletePlaylist('playlist-1', request());
    await controller.deleteItem('playlist-1', 'item-1', request());
    expect(service.deletePlaylist).toHaveBeenCalledWith('playlist-1', 'user-1');
    expect(service.deleteItem).toHaveBeenCalledWith('playlist-1', 'user-1', 'item-1');

    const error = new Error('failed');
    service.getPlaylists.mockRejectedValueOnce(error);
    await expect(controller.getPlaylists(request())).rejects.toThrow(error);
  });
});
