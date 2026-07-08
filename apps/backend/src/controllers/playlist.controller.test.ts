import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { PlaylistController } from './playlist.controller';
import type { PlaylistItemRecord } from '../types/playlist';

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

function makeRequest(): ExRequest {
  return {
    user: { id: 'user-1', email: 'alice@example.com' },
  } as ExRequest;
}

function makePlaylistService() {
  return {
    getPlaylist: vi.fn().mockResolvedValue([playlistItem]),
    addItem: vi.fn().mockResolvedValue(playlistItem),
    reorderPlaylist: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
  };
}

describe('PlaylistController', () => {
  it('GET /rooms/:roomId/playlist 응답을 반환한다', async () => {
    const playlistService = makePlaylistService();
    const controller = new PlaylistController(playlistService);

    await expect(controller.getPlaylist('room-1', makeRequest())).resolves.toEqual({
      success: true,
      data: {
        playlist: [
          {
            id: 'playlist-item-1',
            videoId: 'video-1',
            title: 'Song One',
            channelTitle: 'Channel One',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            duration: 180,
            position: 1,
            addedBy: 'user-1',
            status: 'available',
          },
        ],
      },
    });
    expect(playlistService.getPlaylist).toHaveBeenCalledWith('room-1', 'user-1');
  });

  it('POST /rooms/:roomId/playlist 응답을 반환한다', async () => {
    const playlistService = makePlaylistService();
    const controller = new PlaylistController(playlistService);

    await expect(
      controller.addItem('room-1', makeRequest(), { videoId: 'video-1' }),
    ).resolves.toEqual({
      success: true,
      data: {
        id: 'playlist-item-1',
        videoId: 'video-1',
        title: 'Song One',
        channelTitle: 'Channel One',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: 180,
        position: 1,
        addedBy: 'user-1',
        status: 'available',
      },
    });
    expect(playlistService.addItem).toHaveBeenCalledWith('room-1', 'user-1', {
      videoId: 'video-1',
    });
  });

  it('Service 에러를 그대로 전파한다', async () => {
    const error = new Error('playlist failed');
    const playlistService = makePlaylistService();
    playlistService.getPlaylist.mockRejectedValue(error);
    const controller = new PlaylistController(playlistService);

    await expect(controller.getPlaylist('room-1', makeRequest())).rejects.toThrow(error);
  });

  it('PATCH /rooms/:roomId/playlist/reorder 응답을 반환한다', async () => {
    const playlistService = makePlaylistService();
    const controller = new PlaylistController(playlistService);
    const body = {
      items: [
        { id: 'playlist-item-1', position: 2 },
        { id: 'playlist-item-2', position: 1 },
      ],
    };

    await expect(controller.reorderPlaylist('room-1', makeRequest(), body)).resolves.toEqual({
      success: true,
      data: { message: 'playlist reordered' },
    });
    expect(playlistService.reorderPlaylist).toHaveBeenCalledWith('room-1', 'user-1', body.items);
  });

  it('DELETE /rooms/:roomId/playlist/:itemId 응답을 반환한다', async () => {
    const playlistService = makePlaylistService();
    const controller = new PlaylistController(playlistService);

    await expect(
      controller.deleteItem('room-1', 'playlist-item-1', makeRequest()),
    ).resolves.toEqual({
      success: true,
      data: { message: 'playlist item deleted' },
    });
    expect(playlistService.deleteItem).toHaveBeenCalledWith('room-1', 'user-1', 'playlist-item-1');
  });

  it('순서 변경 Service 에러를 그대로 전파한다', async () => {
    const error = new Error('reorder failed');
    const playlistService = makePlaylistService();
    playlistService.reorderPlaylist.mockRejectedValue(error);
    const controller = new PlaylistController(playlistService);

    await expect(
      controller.reorderPlaylist('room-1', makeRequest(), { items: [] }),
    ).rejects.toThrow(error);
  });

  it('곡 삭제 Service 에러를 그대로 전파한다', async () => {
    const error = new Error('delete failed');
    const playlistService = makePlaylistService();
    playlistService.deleteItem.mockRejectedValue(error);
    const controller = new PlaylistController(playlistService);

    await expect(controller.deleteItem('room-1', 'playlist-item-1', makeRequest())).rejects.toThrow(
      error,
    );
  });
});
