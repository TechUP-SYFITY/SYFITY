import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { PlaylistService, type PlaylistSocketServer } from './playlist.service';
import type { YouTubeVideoDetail } from '../lib/youtube/youtube.client';
import type { IPlaylistRepository, PlaylistItemRecord } from '../types/playlist';
import type { RoomDetailRecord } from '../types/room';

const room: RoomDetailRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  hostId: 'user-1',
  inviteCode: 'ABC123',
  status: 'active',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

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

const videoDetail: YouTubeVideoDetail = {
  videoId: 'video-1',
  title: 'Song One',
  channelTitle: 'Channel One',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  duration: 180,
};

function makeFixture(
  overrides: {
    room?: RoomDetailRecord | null;
    playlist?: PlaylistItemRecord[];
    maxPosition?: number | null;
    addedItem?: PlaylistItemRecord;
    videoDetails?: YouTubeVideoDetail[];
  } = {},
) {
  const playlistRepo = {
    getPlaylist: vi.fn().mockResolvedValue(overrides.playlist ?? [playlistItem]),
    getMaxPosition: vi.fn().mockResolvedValue(overrides.maxPosition ?? null),
    addItem: vi.fn().mockResolvedValue(overrides.addedItem ?? playlistItem),
  } satisfies IPlaylistRepository;

  const roomRepo = {
    findRoomById: vi.fn().mockResolvedValue('room' in overrides ? overrides.room : room),
    findMembership: vi.fn().mockResolvedValue({ role: 'member', status: 'offline' }),
    touchLastActivity: vi.fn().mockResolvedValue(undefined),
  };

  const youtubeClient = {
    getVideoDetails: vi.fn().mockResolvedValue(overrides.videoDetails ?? [videoDetail]),
  };

  const emit = vi.fn().mockReturnValue(true);
  const io = {
    to: vi.fn().mockReturnValue({ emit }),
  } satisfies PlaylistSocketServer;

  return {
    service: new PlaylistService(playlistRepo, roomRepo, youtubeClient, io),
    playlistRepo,
    roomRepo,
    youtubeClient,
    io,
    emit,
  };
}

describe('PlaylistService', () => {
  it('Room이 없으면 플레이리스트 조회에서 ROOM_NOT_FOUND를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({ room: null });

    await expect(service.getPlaylist('room-1', 'user-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(playlistRepo.getPlaylist).not.toHaveBeenCalled();
  });

  it('참여자가 아니면 플레이리스트 조회에서 ROOM_ACCESS_DENIED를 반환한다', async () => {
    const { service, roomRepo, playlistRepo } = makeFixture();
    roomRepo.findMembership.mockResolvedValue(null);

    await expect(service.getPlaylist('room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(playlistRepo.getPlaylist).not.toHaveBeenCalled();
  });

  it('플레이리스트를 조회한다', async () => {
    const { service, playlistRepo } = makeFixture({ playlist: [playlistItem] });

    await expect(service.getPlaylist('room-1', 'user-1')).resolves.toEqual([playlistItem]);
    expect(playlistRepo.getPlaylist).toHaveBeenCalledWith('room-1');
  });

  it('Room이 없으면 곡 추가에서 ROOM_NOT_FOUND를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({ room: null });

    await expect(service.addItem('room-1', 'user-1', { videoId: 'video-1' })).rejects.toMatchObject(
      {
        status: 404,
        code: ERROR_CODES.ROOM_NOT_FOUND,
      },
    );
    expect(playlistRepo.addItem).not.toHaveBeenCalled();
  });

  it('참여자가 아니면 곡 추가에서 ROOM_ACCESS_DENIED를 반환한다', async () => {
    const { service, roomRepo, playlistRepo, youtubeClient } = makeFixture();
    roomRepo.findMembership.mockResolvedValue(null);

    await expect(service.addItem('room-1', 'user-1', { videoId: 'video-1' })).rejects.toMatchObject(
      {
        status: 403,
        code: ERROR_CODES.ROOM_ACCESS_DENIED,
      },
    );
    expect(youtubeClient.getVideoDetails).not.toHaveBeenCalled();
    expect(playlistRepo.addItem).not.toHaveBeenCalled();
  });

  it('videoId 직접 전달 시 곡을 추가한다', async () => {
    const { service, playlistRepo, youtubeClient } = makeFixture();

    await expect(service.addItem('room-1', 'user-1', { videoId: 'video-1' })).resolves.toEqual(
      playlistItem,
    );

    expect(youtubeClient.getVideoDetails).toHaveBeenCalledWith(['video-1']);
    expect(playlistRepo.addItem).toHaveBeenCalledWith({
      roomId: 'room-1',
      videoId: 'video-1',
      title: 'Song One',
      channelTitle: 'Channel One',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      duration: 180,
      position: 1,
      addedBy: 'user-1',
    });
  });

  it.each([
    ['watch', 'https://youtube.com/watch?v=video-1'],
    ['youtu.be', 'https://youtu.be/video-1'],
    ['embed', 'https://www.youtube.com/embed/video-1'],
    ['shorts', 'https://youtube.com/shorts/video-1'],
  ])('youtubeUrl %s 형식에서 videoId를 파싱한다', async (_name, youtubeUrl) => {
    const { service, youtubeClient } = makeFixture();

    await service.addItem('room-1', 'user-1', { youtubeUrl });

    expect(youtubeClient.getVideoDetails).toHaveBeenCalledWith(['video-1']);
  });

  it('videoId와 youtubeUrl을 함께 전달하면 videoId를 우선한다', async () => {
    const { service, youtubeClient } = makeFixture();

    await service.addItem('room-1', 'user-1', {
      videoId: 'video-priority',
      youtubeUrl: 'https://youtu.be/video-url',
    });

    expect(youtubeClient.getVideoDetails).toHaveBeenCalledWith(['video-priority']);
  });

  it('파싱 불가 URL이면 PLAYLIST_INVALID_URL을 반환한다', async () => {
    const { service, youtubeClient } = makeFixture();

    await expect(
      service.addItem('room-1', 'user-1', { youtubeUrl: 'https://example.com/video-1' }),
    ).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.PLAYLIST_INVALID_URL,
    });
    expect(youtubeClient.getVideoDetails).not.toHaveBeenCalled();
  });

  it('videoId와 youtubeUrl이 모두 없으면 PLAYLIST_INVALID_URL을 반환한다', async () => {
    const { service, youtubeClient } = makeFixture();

    await expect(service.addItem('room-1', 'user-1', {})).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.PLAYLIST_INVALID_URL,
    });
    expect(youtubeClient.getVideoDetails).not.toHaveBeenCalled();
  });

  it('YouTube 상세가 없으면 PLAYLIST_VIDEO_UNAVAILABLE을 반환한다', async () => {
    const { service } = makeFixture({ videoDetails: [] });

    await expect(service.addItem('room-1', 'user-1', { videoId: 'video-1' })).rejects.toMatchObject(
      {
        status: 400,
        code: ERROR_CODES.PLAYLIST_VIDEO_UNAVAILABLE,
      },
    );
  });

  it('duration이 0이면 PLAYLIST_VIDEO_UNAVAILABLE을 반환한다', async () => {
    const { service } = makeFixture({ videoDetails: [{ ...videoDetail, duration: 0 }] });

    await expect(service.addItem('room-1', 'user-1', { videoId: 'video-1' })).rejects.toMatchObject(
      {
        status: 400,
        code: ERROR_CODES.PLAYLIST_VIDEO_UNAVAILABLE,
      },
    );
  });

  it('기존 항목이 있으면 최대 position + 1로 추가한다', async () => {
    const { service, playlistRepo } = makeFixture({ maxPosition: 3 });

    await service.addItem('room-1', 'user-1', { videoId: 'video-1' });

    expect(playlistRepo.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        position: 4,
      }),
    );
  });

  it('곡 추가 후 lastActivityAt을 갱신하고 playlist:updated를 broadcast한다', async () => {
    const { service, roomRepo, io, emit } = makeFixture();

    await service.addItem('room-1', 'user-1', { videoId: 'video-1' });

    expect(roomRepo.touchLastActivity).toHaveBeenCalledWith('room-1');
    expect(io.to).toHaveBeenCalledWith('room:room-1');
    expect(emit).toHaveBeenCalledWith('playlist:updated', {
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
    });
  });
});
