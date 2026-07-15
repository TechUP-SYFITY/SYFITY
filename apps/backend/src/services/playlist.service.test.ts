import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { PlaylistService } from './playlist.service';
import type { YouTubeVideoDetail } from '../lib/youtube/youtube.client';
import { broadcastToRoom } from '../socket/broadcast';
import type { PlaybackStateRecord } from '../types/playback';
import type {
  IPlaylistRepository,
  PlaylistItemLookupRecord,
  PlaylistItemRecord,
} from '../types/playlist';
import { PlaylistDuplicateVideoError } from '../types/playlist';
import type { RoomDetailRecord } from '../types/room';
import type { PlaybackStatePayload } from '../types/socket';

vi.mock('../socket/broadcast', () => ({
  broadcastToRoom: vi.fn(),
}));

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

const secondPlaylistItem: PlaylistItemRecord = {
  ...playlistItem,
  id: 'playlist-item-2',
  videoId: 'video-2',
  title: 'Song Two',
  channelTitle: 'Channel Two',
  position: 2,
  addedBy: 'user-2',
};

const unavailablePlaylistItem: PlaylistItemRecord = {
  ...playlistItem,
  id: 'playlist-item-unavailable',
  videoId: 'video-unavailable',
  title: 'Unavailable Song',
  position: 2,
  status: 'unavailable',
};

const thirdPlaylistItem: PlaylistItemRecord = {
  ...playlistItem,
  id: 'playlist-item-3',
  videoId: 'video-3',
  title: 'Song Three',
  position: 3,
  addedBy: 'user-3',
};

const playlistItemLookup: PlaylistItemLookupRecord = {
  id: 'playlist-item-1',
  roomId: 'room-1',
  videoId: 'video-1',
  position: 1,
  addedBy: 'user-1',
  status: 'available',
};

const playbackState: PlaybackStateRecord = {
  videoId: null,
  playlistItemId: null,
  baseCurrentTime: 0,
  isPlaying: false,
  serverStartedAt: null,
  serverPausedAt: null,
  updatedAt: new Date('2026-07-01T12:00:00.000Z'),
};

const nextTrackPayload: PlaybackStatePayload = {
  currentTime: 0,
  isPlaying: true,
  videoId: 'video-2',
  playlistItemId: 'playlist-item-2',
};

const resetPayload: PlaybackStatePayload = {
  currentTime: 0,
  isPlaying: false,
  videoId: null,
  playlistItemId: null,
};

const videoDetail: YouTubeVideoDetail = {
  videoId: 'video-1',
  title: 'Song One',
  channelTitle: 'Channel One',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  duration: 180,
  embeddable: true,
  categoryId: '10',
};

function makeFixture(
  overrides: {
    room?: RoomDetailRecord | null;
    playlist?: PlaylistItemRecord[];
    addedItem?: PlaylistItemRecord;
    addItemError?: Error;
    duplicateItem?: PlaylistItemRecord | null;
    lookupItem?: PlaylistItemLookupRecord | null;
    playbackState?: PlaybackStateRecord | null;
    videoDetails?: YouTubeVideoDetail[];
  } = {},
) {
  const playlistRepo = {
    getPlaylist: vi.fn().mockResolvedValue(overrides.playlist ?? [playlistItem]),
    addItem:
      'addItemError' in overrides
        ? vi.fn().mockRejectedValue(overrides.addItemError)
        : vi.fn().mockResolvedValue(overrides.addedItem ?? playlistItem),
    findItemByRoomAndVideoId: vi
      .fn()
      .mockResolvedValue('duplicateItem' in overrides ? overrides.duplicateItem : null),
    findItemById: vi.fn().mockResolvedValue(overrides.lookupItem ?? null),
    markUnavailable: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn().mockResolvedValue(undefined),
  } satisfies IPlaylistRepository;

  const roomRepo = {
    findRoomById: vi.fn().mockResolvedValue('room' in overrides ? overrides.room : room),
    findMembership: vi.fn().mockResolvedValue({ role: 'member', status: 'offline' }),
    touchLastActivity: vi.fn().mockResolvedValue(undefined),
  };

  const youtubeClient = {
    getVideoDetails: vi.fn().mockResolvedValue(overrides.videoDetails ?? [videoDetail]),
  };

  const playbackService = {
    getPlaybackState: vi
      .fn()
      .mockResolvedValue('playbackState' in overrides ? overrides.playbackState : playbackState),
    setTrack: vi.fn().mockResolvedValue(nextTrackPayload),
    resetPlayback: vi.fn().mockResolvedValue(resetPayload),
  };

  return {
    service: new PlaylistService(playlistRepo, roomRepo, youtubeClient, playbackService),
    playlistRepo,
    roomRepo,
    youtubeClient,
    playbackService,
  };
}

describe('PlaylistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    expect(playlistRepo.findItemByRoomAndVideoId).toHaveBeenCalledWith('room-1', 'video-1');
    expect(playlistRepo.addItem).toHaveBeenCalledWith({
      roomId: 'room-1',
      videoId: 'video-1',
      title: 'Song One',
      channelTitle: 'Channel One',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      duration: 180,
      addedBy: 'user-1',
    });
  });

  it('같은 Room에 이미 추가된 videoId면 중복 오류를 반환한다', async () => {
    const { service, playlistRepo, youtubeClient } = makeFixture({ duplicateItem: playlistItem });

    await expect(service.addItem('room-1', 'user-1', { videoId: 'video-1' })).rejects.toMatchObject(
      {
        status: 409,
        code: ERROR_CODES.PLAYLIST_DUPLICATE_VIDEO,
      },
    );
    expect(youtubeClient.getVideoDetails).not.toHaveBeenCalled();
    expect(playlistRepo.addItem).not.toHaveBeenCalled();
  });

  it('동시 추가로 DB unique 제약이 충돌해도 중복 오류를 반환한다', async () => {
    const { service } = makeFixture({
      addItemError: new PlaylistDuplicateVideoError(),
    });

    await expect(service.addItem('room-1', 'user-1', { videoId: 'video-1' })).rejects.toMatchObject(
      {
        status: 409,
        code: ERROR_CODES.PLAYLIST_DUPLICATE_VIDEO,
      },
    );
  });

  it.each([
    ['watch', 'https://youtube.com/watch?v=video-1'],
    ['youtu.be', 'https://youtu.be/video-1'],
    ['embed', 'https://www.youtube.com/embed/video-1'],
    ['shorts', 'https://youtube.com/shorts/video-1'],
    ['music.youtube.com', 'https://music.youtube.com/watch?v=video-1'],
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

  it('임베드가 금지된 영상이면 PLAYLIST_VIDEO_UNAVAILABLE을 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({
      videoDetails: [{ ...videoDetail, embeddable: false }],
    });

    await expect(service.addItem('room-1', 'user-1', { videoId: 'video-1' })).rejects.toMatchObject(
      {
        status: 400,
        code: ERROR_CODES.PLAYLIST_VIDEO_UNAVAILABLE,
      },
    );
    expect(playlistRepo.addItem).not.toHaveBeenCalled();
  });

  it('곡 추가 후 lastActivityAt을 갱신하고 playlist:updated를 broadcast한다', async () => {
    const { service, roomRepo } = makeFixture();

    await service.addItem('room-1', 'user-1', { videoId: 'video-1' });

    expect(roomRepo.touchLastActivity).toHaveBeenCalledWith('room-1');
    expect(broadcastToRoom).toHaveBeenCalledWith('room-1', 'playlist:updated', {
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

  it('Room이 없으면 순서 변경에서 ROOM_NOT_FOUND를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({ room: null });

    await expect(
      service.reorderPlaylist('room-1', 'user-1', [{ id: 'playlist-item-1', position: 1 }]),
    ).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(playlistRepo.reorderItems).not.toHaveBeenCalled();
  });

  it('참여자가 아니면 순서 변경에서 ROOM_ACCESS_DENIED를 반환한다', async () => {
    const { service, roomRepo, playlistRepo } = makeFixture();
    roomRepo.findMembership.mockResolvedValue(null);

    await expect(
      service.reorderPlaylist('room-1', 'user-1', [{ id: 'playlist-item-1', position: 1 }]),
    ).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(playlistRepo.reorderItems).not.toHaveBeenCalled();
  });

  it('Host가 아니면 순서 변경에서 AUTH_FORBIDDEN을 반환한다', async () => {
    const { service, playlistRepo } = makeFixture();

    await expect(
      service.reorderPlaylist('room-1', 'user-2', [{ id: 'playlist-item-1', position: 1 }]),
    ).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(playlistRepo.reorderItems).not.toHaveBeenCalled();
  });

  it('순서 변경 요청에 존재하지 않는 항목이 있으면 PLAYLIST_ITEM_NOT_FOUND를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({ playlist: [playlistItem] });

    await expect(
      service.reorderPlaylist('room-1', 'user-1', [{ id: 'missing-item', position: 1 }]),
    ).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND,
    });
    expect(playlistRepo.reorderItems).not.toHaveBeenCalled();
  });

  it('순서 변경 요청에서 일부 항목이 누락되면 PLAYLIST_ITEM_NOT_FOUND를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({ playlist: [playlistItem, secondPlaylistItem] });

    await expect(
      service.reorderPlaylist('room-1', 'user-1', [{ id: 'playlist-item-1', position: 1 }]),
    ).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND,
    });
    expect(playlistRepo.reorderItems).not.toHaveBeenCalled();
  });

  it('순서 변경 요청에 중복 항목이 있으면 PLAYLIST_ITEM_NOT_FOUND를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({ playlist: [playlistItem, secondPlaylistItem] });

    await expect(
      service.reorderPlaylist('room-1', 'user-1', [
        { id: 'playlist-item-1', position: 2 },
        { id: 'playlist-item-1', position: 1 },
      ]),
    ).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND,
    });
    expect(playlistRepo.reorderItems).not.toHaveBeenCalled();
  });

  it('순서 변경 요청에 중복된 position 값이 있으면 VALIDATION_ERROR를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({ playlist: [playlistItem, secondPlaylistItem] });

    await expect(
      service.reorderPlaylist('room-1', 'user-1', [
        { id: 'playlist-item-1', position: 1 },
        { id: 'playlist-item-2', position: 1 },
      ]),
    ).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
    });
    expect(playlistRepo.reorderItems).not.toHaveBeenCalled();
  });

  it('Host가 전체 항목 id를 보내면 position 값을 그대로 저장하고 playlist:updated를 broadcast한다', async () => {
    const items = [
      { id: 'playlist-item-1', position: 2 },
      { id: 'playlist-item-2', position: 1 },
    ];
    const { service, playlistRepo, roomRepo } = makeFixture({
      playlist: [playlistItem, secondPlaylistItem],
    });

    await expect(service.reorderPlaylist('room-1', 'user-1', items)).resolves.toBeUndefined();

    expect(playlistRepo.reorderItems).toHaveBeenCalledWith(items);
    expect(roomRepo.touchLastActivity).toHaveBeenCalledWith('room-1');
    expect(broadcastToRoom).toHaveBeenCalledWith('room-1', 'playlist:updated', {
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
        {
          id: 'playlist-item-2',
          videoId: 'video-2',
          title: 'Song Two',
          channelTitle: 'Channel Two',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          duration: 180,
          position: 2,
          addedBy: 'user-2',
          status: 'available',
        },
      ],
    });
  });

  it('빈 플레이리스트에 빈 순서 변경 요청을 허용한다', async () => {
    const { service, playlistRepo } = makeFixture({ playlist: [] });

    await expect(service.reorderPlaylist('room-1', 'user-1', [])).resolves.toBeUndefined();

    expect(playlistRepo.reorderItems).toHaveBeenCalledWith([]);
  });

  it('Room이 없으면 곡 삭제에서 ROOM_NOT_FOUND를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({ room: null, lookupItem: playlistItemLookup });

    await expect(service.deleteItem('room-1', 'user-1', 'playlist-item-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(playlistRepo.deleteItem).not.toHaveBeenCalled();
  });

  it('참여자가 아니면 곡 삭제에서 ROOM_ACCESS_DENIED를 반환한다', async () => {
    const { service, roomRepo, playlistRepo } = makeFixture({ lookupItem: playlistItemLookup });
    roomRepo.findMembership.mockResolvedValue(null);

    await expect(service.deleteItem('room-1', 'user-1', 'playlist-item-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(playlistRepo.deleteItem).not.toHaveBeenCalled();
  });

  it('곡 삭제 대상 항목이 없으면 PLAYLIST_ITEM_NOT_FOUND를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({ lookupItem: null });

    await expect(service.deleteItem('room-1', 'user-1', 'playlist-item-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND,
    });
    expect(playlistRepo.deleteItem).not.toHaveBeenCalled();
  });

  it('곡 삭제 대상 항목이 다른 Room 소속이면 PLAYLIST_ITEM_NOT_FOUND를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({
      lookupItem: { ...playlistItemLookup, roomId: 'other-room' },
    });

    await expect(service.deleteItem('room-1', 'user-1', 'playlist-item-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND,
    });
    expect(playlistRepo.deleteItem).not.toHaveBeenCalled();
  });

  it('Member가 타인이 추가한 곡을 삭제하면 AUTH_FORBIDDEN을 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({
      lookupItem: { ...playlistItemLookup, addedBy: 'user-1' },
    });

    await expect(service.deleteItem('room-1', 'user-2', 'playlist-item-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(playlistRepo.deleteItem).not.toHaveBeenCalled();
  });

  it('Member는 본인이 추가한 곡을 삭제할 수 있다', async () => {
    const { service, playlistRepo } = makeFixture({
      lookupItem: { ...playlistItemLookup, addedBy: 'user-2' },
      playlist: [],
    });

    await expect(
      service.deleteItem('room-1', 'user-2', 'playlist-item-1'),
    ).resolves.toBeUndefined();

    expect(playlistRepo.deleteItem).toHaveBeenCalledWith('playlist-item-1');
    expect(broadcastToRoom).toHaveBeenCalledWith('room-1', 'playlist:updated', { playlist: [] });
  });

  it('Host는 타인이 추가한 곡을 삭제할 수 있다', async () => {
    const { service, playlistRepo } = makeFixture({
      lookupItem: { ...playlistItemLookup, addedBy: 'user-2' },
      playlist: [],
    });

    await expect(
      service.deleteItem('room-1', 'user-1', 'playlist-item-1'),
    ).resolves.toBeUndefined();

    expect(playlistRepo.deleteItem).toHaveBeenCalledWith('playlist-item-1');
  });

  it('PlaybackState가 없으면 곡을 삭제하지 않고 SERVER_INTERNAL_ERROR를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({
      lookupItem: playlistItemLookup,
      playbackState: null,
    });

    await expect(service.deleteItem('room-1', 'user-1', 'playlist-item-1')).rejects.toMatchObject({
      status: 500,
      code: ERROR_CODES.SERVER_INTERNAL_ERROR,
    });
    expect(playlistRepo.deleteItem).not.toHaveBeenCalled();
  });

  it('현재 재생 곡이 아니면 PlaybackState 변경 없이 playlist:updated만 broadcast한다', async () => {
    const { service, playlistRepo, roomRepo, playbackService } = makeFixture({
      lookupItem: playlistItemLookup,
      playlist: [],
    });

    await expect(
      service.deleteItem('room-1', 'user-1', 'playlist-item-1'),
    ).resolves.toBeUndefined();

    expect(playbackService.setTrack).not.toHaveBeenCalled();
    expect(playbackService.resetPlayback).not.toHaveBeenCalled();
    expect(playlistRepo.deleteItem).toHaveBeenCalledWith('playlist-item-1');
    expect(roomRepo.touchLastActivity).toHaveBeenCalledWith('room-1');
    expect(broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(broadcastToRoom).toHaveBeenCalledWith('room-1', 'playlist:updated', { playlist: [] });
  });

  it('현재 재생 곡 삭제 시 다음 available 곡으로 PlaybackState를 먼저 갱신하고 broadcast한다', async () => {
    const { service, playlistRepo, playbackService } = makeFixture({
      lookupItem: playlistItemLookup,
      playbackState: { ...playbackState, playlistItemId: 'playlist-item-1', videoId: 'video-1' },
    });
    playlistRepo.getPlaylist
      .mockResolvedValueOnce([playlistItem, secondPlaylistItem])
      .mockResolvedValueOnce([secondPlaylistItem]);

    await expect(
      service.deleteItem('room-1', 'user-1', 'playlist-item-1'),
    ).resolves.toBeUndefined();

    expect(playbackService.setTrack).toHaveBeenCalledWith('room-1', 'video-2', 'playlist-item-2');
    expect(playbackService.setTrack.mock.invocationCallOrder[0]).toBeLessThan(
      playlistRepo.deleteItem.mock.invocationCallOrder[0],
    );
    expect(broadcastToRoom).toHaveBeenNthCalledWith(
      1,
      'room-1',
      'playback:change-track',
      nextTrackPayload,
    );
    expect(broadcastToRoom).toHaveBeenNthCalledWith(2, 'room-1', 'playlist:updated', {
      playlist: [
        {
          id: 'playlist-item-2',
          videoId: 'video-2',
          title: 'Song Two',
          channelTitle: 'Channel Two',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          duration: 180,
          position: 2,
          addedBy: 'user-2',
          status: 'available',
        },
      ],
    });
  });

  it('현재 재생 곡 삭제 시 unavailable 항목을 건너뛰고 다음 available 곡을 선택한다', async () => {
    const { service, playlistRepo, playbackService } = makeFixture({
      lookupItem: playlistItemLookup,
      playbackState: { ...playbackState, playlistItemId: 'playlist-item-1', videoId: 'video-1' },
    });
    playlistRepo.getPlaylist
      .mockResolvedValueOnce([playlistItem, unavailablePlaylistItem, thirdPlaylistItem])
      .mockResolvedValueOnce([unavailablePlaylistItem, thirdPlaylistItem]);

    await service.deleteItem('room-1', 'user-1', 'playlist-item-1');

    expect(playbackService.setTrack).toHaveBeenCalledWith('room-1', 'video-3', 'playlist-item-3');
    expect(playbackService.resetPlayback).not.toHaveBeenCalled();
  });

  it('현재 재생 곡 삭제 시 다음 available 곡이 없으면 PlaybackState를 초기화하고 pause를 broadcast한다', async () => {
    const { service, playlistRepo, playbackService } = makeFixture({
      lookupItem: playlistItemLookup,
      playbackState: { ...playbackState, playlistItemId: 'playlist-item-1', videoId: 'video-1' },
    });
    playlistRepo.getPlaylist
      .mockResolvedValueOnce([playlistItem, unavailablePlaylistItem])
      .mockResolvedValueOnce([unavailablePlaylistItem]);

    await expect(
      service.deleteItem('room-1', 'user-1', 'playlist-item-1'),
    ).resolves.toBeUndefined();

    expect(playbackService.resetPlayback).toHaveBeenCalledWith('room-1');
    expect(playbackService.resetPlayback.mock.invocationCallOrder[0]).toBeLessThan(
      playlistRepo.deleteItem.mock.invocationCallOrder[0],
    );
    expect(broadcastToRoom).toHaveBeenNthCalledWith(1, 'room-1', 'playback:pause', resetPayload);
    expect(broadcastToRoom).toHaveBeenNthCalledWith(2, 'room-1', 'playlist:updated', {
      playlist: [
        {
          id: 'playlist-item-unavailable',
          videoId: 'video-unavailable',
          title: 'Unavailable Song',
          channelTitle: 'Channel One',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          duration: 180,
          position: 2,
          addedBy: 'user-1',
          status: 'unavailable',
        },
      ],
    });
  });

  it('곡 삭제 성공 시 lastActivityAt을 갱신한다', async () => {
    const { service, roomRepo } = makeFixture({
      lookupItem: playlistItemLookup,
      playlist: [],
    });

    await service.deleteItem('room-1', 'user-1', 'playlist-item-1');

    expect(roomRepo.touchLastActivity).toHaveBeenCalledWith('room-1');
  });
});
