import { afterEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { PlaybackService } from './playback.service';
import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys } from '../lib/cache/cacheKeys';
import type { YouTubeVideoDetail } from '../lib/youtube/youtube.client';
import type { PlaybackStateCache } from '../types/cache';
import type {
  IPlaybackRepository,
  PlaybackStateRecord,
  PlaybackStateUpdateData,
} from '../types/playback';
import type {
  IPlaylistRepository,
  PlaylistItemLookupRecord,
  PlaylistItemRecord,
} from '../types/playlist';
import type { IRoomRepository, RoomDetailRecord } from '../types/room';

const room: RoomDetailRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  hostId: 'host-1',
  inviteCode: 'ABC123',
  status: 'active',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

const playbackState: PlaybackStateRecord = {
  videoId: 'video-1',
  playlistItemId: 'playlist-item-1',
  baseCurrentTime: 30,
  isPlaying: false,
  serverStartedAt: null,
  serverPausedAt: new Date('2026-07-01T12:00:05.000Z'),
  updatedAt: new Date('2026-07-01T12:00:10.000Z'),
};

const playlistItem: PlaylistItemRecord = {
  id: 'playlist-item-1',
  videoId: 'video-1',
  title: 'Song One',
  channelTitle: 'Channel One',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  duration: 180,
  position: 1,
  addedBy: 'host-1',
  status: 'available',
  addedAt: new Date('2026-07-01T12:00:00.000Z'),
};

const playlistLookup: PlaylistItemLookupRecord = {
  id: 'playlist-item-1',
  roomId: 'room-1',
  videoId: 'video-1',
  position: 1,
  addedBy: 'host-1',
  status: 'available',
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

function makeCache(overrides: { getResult?: PlaybackStateCache } = {}): ICache {
  return {
    get: vi.fn().mockReturnValue(overrides.getResult),
    set: vi.fn(),
    del: vi.fn(),
    has: vi.fn().mockReturnValue(false),
  };
}

function makeFixture(
  overrides: {
    playbackRecord?: PlaybackStateRecord | null;
    cache?: ICache;
    room?: RoomDetailRecord | null;
    membership?: { role: 'host' | 'member'; status: 'online' | 'offline' | 'left' } | null;
    playlist?: PlaylistItemRecord[];
    playlistLookup?: PlaylistItemLookupRecord | null;
    videoDetails?: YouTubeVideoDetail[];
    youtubeReject?: Error;
  } = {},
) {
  const playbackRepo = {
    findByRoomId: vi
      .fn()
      .mockResolvedValue('playbackRecord' in overrides ? overrides.playbackRecord : playbackState),
    updateState: vi.fn(async (_roomId: string, data: PlaybackStateUpdateData) => ({
      ...playbackState,
      ...data,
      updatedAt: new Date('2026-07-01T12:00:10.000Z'),
    })),
  } satisfies IPlaybackRepository;

  const roomRepo = {
    findRoomById: vi.fn().mockResolvedValue('room' in overrides ? overrides.room : room),
    findMembership: vi
      .fn()
      .mockResolvedValue(
        'membership' in overrides ? overrides.membership : { role: 'host', status: 'online' },
      ),
    touchLastActivity: vi.fn().mockResolvedValue(undefined),
  } satisfies Pick<IRoomRepository, 'findRoomById' | 'findMembership' | 'touchLastActivity'>;

  const playlistRepo = {
    getPlaylist: vi.fn().mockResolvedValue(overrides.playlist ?? [playlistItem]),
    findItemById: vi
      .fn()
      .mockResolvedValue('playlistLookup' in overrides ? overrides.playlistLookup : playlistLookup),
    markUnavailable: vi.fn().mockResolvedValue(undefined),
  } satisfies Pick<IPlaylistRepository, 'getPlaylist' | 'findItemById' | 'markUnavailable'>;

  const youtubeClient = {
    getVideoDetails: overrides.youtubeReject
      ? vi.fn().mockRejectedValue(overrides.youtubeReject)
      : vi.fn().mockResolvedValue(overrides.videoDetails ?? [videoDetail]),
  };

  const cache = overrides.cache ?? makeCache();
  return {
    service: new PlaybackService(playbackRepo, roomRepo, playlistRepo, cache, youtubeClient),
    playbackRepo,
    roomRepo,
    playlistRepo,
    youtubeClient,
    cache,
  };
}

describe('PlaybackService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Room 생성 시 초기 PlaybackState를 캐시에 저장한다', () => {
    const { service, cache } = makeFixture();

    service.initializeCache('room-1');

    expect(cache.set).toHaveBeenCalledWith(
      CacheKeys.playbackState('room-1'),
      {
        videoId: null,
        playlistItemId: null,
        baseCurrentTime: 0,
        isPlaying: false,
        serverStartedAt: null,
        serverPausedAt: null,
      },
      0,
    );
  });

  it('Room 종료 시 PlaybackState 캐시를 삭제한다', () => {
    const { service, cache } = makeFixture();

    service.clearCache('room-1');

    expect(cache.del).toHaveBeenCalledWith(CacheKeys.playbackState('room-1'));
  });

  it('Room 종료 시 재생 중 Room 목록에서도 제거한다', async () => {
    const { service } = makeFixture();

    await service.play('room-1', 'host-1', 0);
    service.clearCache('room-1');

    expect(service.getPlayingRoomIds()).not.toContain('room-1');
  });

  it('소켓용 조회는 활성 참여자 검증 후 캐시 히트 값을 반환한다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:05.000Z'));
    const cache = makeCache({
      getResult: {
        videoId: 'video-1',
        playlistItemId: 'playlist-item-1',
        baseCurrentTime: 30,
        isPlaying: true,
        serverStartedAt: '2026-07-01T12:00:00.000Z',
        serverPausedAt: null,
      },
    });
    const { service, playbackRepo } = makeFixture({ cache });

    await expect(service.getPlaybackStateForSocket('room-1', 'host-1')).resolves.toEqual({
      videoId: 'video-1',
      playlistItemId: 'playlist-item-1',
      currentTime: 35,
      isPlaying: true,
    });
    expect(playbackRepo.findByRoomId).not.toHaveBeenCalled();
  });

  it('소켓용 조회는 참여자가 아니면 재생 상태를 읽지 않는다', async () => {
    const { service, playbackRepo, cache } = makeFixture({ membership: null });

    await expect(service.getPlaybackStateForSocket('room-1', 'user-2')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(cache.get).not.toHaveBeenCalled();
    expect(playbackRepo.findByRoomId).not.toHaveBeenCalled();
  });

  it('소켓용 조회는 캐시 미스 시 DB 값으로 캐시를 재구성한다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:05.000Z'));
    const { service, playbackRepo, cache } = makeFixture({
      playbackRecord: {
        ...playbackState,
        baseCurrentTime: 30,
        isPlaying: true,
        serverStartedAt: new Date('2026-07-01T12:00:00.000Z'),
        serverPausedAt: null,
      },
    });

    await expect(service.getPlaybackStateForSocket('room-1', 'host-1')).resolves.toEqual({
      videoId: 'video-1',
      playlistItemId: 'playlist-item-1',
      currentTime: 35,
      isPlaying: true,
    });
    expect(playbackRepo.findByRoomId).toHaveBeenCalledWith('room-1');
    expect(cache.set).toHaveBeenCalledWith(
      CacheKeys.playbackState('room-1'),
      {
        videoId: 'video-1',
        playlistItemId: 'playlist-item-1',
        baseCurrentTime: 30,
        isPlaying: true,
        serverStartedAt: '2026-07-01T12:00:00.000Z',
        serverPausedAt: null,
      },
      0,
    );
  });

  it('tick용 조회는 권한 검증 없이 캐시 히트 값을 반환한다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:05.000Z'));
    const cache = makeCache({
      getResult: {
        videoId: 'video-1',
        playlistItemId: 'playlist-item-1',
        baseCurrentTime: 30,
        isPlaying: true,
        serverStartedAt: '2026-07-01T12:00:00.000Z',
        serverPausedAt: null,
      },
    });
    const { service, playbackRepo, roomRepo } = makeFixture({ cache });

    await expect(service.getStateForTick('room-1')).resolves.toEqual({
      videoId: 'video-1',
      playlistItemId: 'playlist-item-1',
      currentTime: 35,
      isPlaying: true,
    });
    expect(roomRepo.findMembership).not.toHaveBeenCalled();
    expect(playbackRepo.findByRoomId).not.toHaveBeenCalled();
  });

  it('tick용 조회는 캐시 미스 시 DB 값으로 캐시를 재구성한다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:05.000Z'));
    const { service, playbackRepo, cache } = makeFixture({
      playbackRecord: {
        ...playbackState,
        baseCurrentTime: 30,
        isPlaying: true,
        serverStartedAt: new Date('2026-07-01T12:00:00.000Z'),
        serverPausedAt: null,
      },
    });

    await expect(service.getStateForTick('room-1')).resolves.toEqual({
      videoId: 'video-1',
      playlistItemId: 'playlist-item-1',
      currentTime: 35,
      isPlaying: true,
    });
    expect(playbackRepo.findByRoomId).toHaveBeenCalledWith('room-1');
    expect(cache.set).toHaveBeenCalledWith(
      CacheKeys.playbackState('room-1'),
      {
        videoId: 'video-1',
        playlistItemId: 'playlist-item-1',
        baseCurrentTime: 30,
        isPlaying: true,
        serverStartedAt: '2026-07-01T12:00:00.000Z',
        serverPausedAt: null,
      },
      0,
    );
  });

  it('tick용 조회는 캐시와 DB에 모두 없으면 SERVER_INTERNAL_ERROR를 던진다', async () => {
    const { service } = makeFixture({ playbackRecord: null });

    await expect(service.getStateForTick('room-1')).rejects.toMatchObject({
      status: 500,
      code: ERROR_CODES.SERVER_INTERNAL_ERROR,
    });
  });

  it('join용 조회는 DB 원본에서 updatedAt 포함 결과를 반환한다', async () => {
    const { service } = makeFixture();

    await expect(service.getPlaybackStateForJoin('room-1')).resolves.toEqual({
      videoId: 'video-1',
      playlistItemId: 'playlist-item-1',
      currentTime: 30,
      isPlaying: false,
      updatedAt: '2026-07-01T12:00:10.000Z',
    });
  });

  it('play는 선택된 트랙이 있으면 상태를 재생 중으로 갱신한다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:10:00.000Z'));
    const { service, playbackRepo, roomRepo } = makeFixture();

    await expect(service.play('room-1', 'host-1', 42)).resolves.toMatchObject({
      broadcastEvent: 'playback:play',
      payload: {
        videoId: 'video-1',
        playlistItemId: 'playlist-item-1',
        currentTime: 42,
        isPlaying: true,
      },
    });
    expect(roomRepo.touchLastActivity).toHaveBeenCalledWith('room-1');
    expect(playbackRepo.updateState).toHaveBeenCalledWith('room-1', {
      videoId: 'video-1',
      playlistItemId: 'playlist-item-1',
      baseCurrentTime: 42,
      isPlaying: true,
      serverStartedAt: new Date('2026-07-01T12:10:00.000Z'),
      serverPausedAt: null,
    });
    expect(service.getPlayingRoomIds()).toContain('room-1');
  });

  it('play는 트랙 미선택 상태이면 플레이리스트 첫 곡으로 change-track을 수행한다', async () => {
    const { service, playlistRepo, playbackRepo } = makeFixture({
      playbackRecord: { ...playbackState, videoId: null, playlistItemId: null },
    });

    await expect(service.play('room-1', 'host-1', 0)).resolves.toMatchObject({
      broadcastEvent: 'playback:change-track',
      payload: { videoId: 'video-1', playlistItemId: 'playlist-item-1', isPlaying: true },
    });
    expect(playlistRepo.getPlaylist).toHaveBeenCalledWith('room-1');
    expect(playbackRepo.updateState).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({
        videoId: 'video-1',
        playlistItemId: 'playlist-item-1',
        baseCurrentTime: 0,
        isPlaying: true,
      }),
    );
  });

  it('play는 트랙 미선택 상태에서 플레이리스트도 비어 있으면 거부한다', async () => {
    const { service, playbackRepo } = makeFixture({
      playbackRecord: { ...playbackState, videoId: null, playlistItemId: null },
      playlist: [],
    });

    await expect(service.play('room-1', 'host-1', 0)).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND,
    });
    expect(playbackRepo.updateState).not.toHaveBeenCalled();
  });

  it('play는 트랙 미선택 상태이면 첫 곡이 unavailable이어도 다음 available 곡으로 change-track을 수행한다', async () => {
    const secondItem: PlaylistItemRecord = {
      ...playlistItem,
      id: 'playlist-item-2',
      videoId: 'video-2',
      position: 2,
    };
    const { service, playlistRepo, playbackRepo } = makeFixture({
      playbackRecord: { ...playbackState, videoId: null, playlistItemId: null },
      playlist: [{ ...playlistItem, status: 'unavailable' }, secondItem],
      playlistLookup: { ...playlistLookup, id: 'playlist-item-2', videoId: 'video-2' },
    });

    await expect(service.play('room-1', 'host-1', 0)).resolves.toMatchObject({
      broadcastEvent: 'playback:change-track',
      payload: { videoId: 'video-2', playlistItemId: 'playlist-item-2', isPlaying: true },
    });
    expect(playlistRepo.getPlaylist).toHaveBeenCalledWith('room-1');
    expect(playbackRepo.updateState).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({
        videoId: 'video-2',
        playlistItemId: 'playlist-item-2',
        baseCurrentTime: 0,
        isPlaying: true,
      }),
    );
  });

  it('play는 트랙 미선택 상태에서 플레이리스트 전체가 unavailable이면 거부한다', async () => {
    const { service, playbackRepo } = makeFixture({
      playbackRecord: { ...playbackState, videoId: null, playlistItemId: null },
      playlist: [{ ...playlistItem, status: 'unavailable' }],
    });

    await expect(service.play('room-1', 'host-1', 0)).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND,
    });
    expect(playbackRepo.updateState).not.toHaveBeenCalled();
  });

  it('pause는 현재 트랙을 유지하고 일시정지 상태로 갱신한다', async () => {
    const { service, playbackRepo } = makeFixture();

    await service.play('room-1', 'host-1', 0);
    await expect(service.pause('room-1', 'host-1', 50)).resolves.toMatchObject({
      videoId: 'video-1',
      playlistItemId: 'playlist-item-1',
      currentTime: 50,
      isPlaying: false,
    });
    expect(playbackRepo.updateState).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({
        videoId: 'video-1',
        playlistItemId: 'playlist-item-1',
        baseCurrentTime: 50,
        isPlaying: false,
        serverStartedAt: null,
      }),
    );
    expect(service.getPlayingRoomIds()).not.toContain('room-1');
  });

  it('seek는 재생 중이면 재생 상태를 유지하고 시작 기준 시각을 갱신한다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:10:00.000Z'));
    const { service, playbackRepo } = makeFixture({
      playbackRecord: {
        ...playbackState,
        isPlaying: true,
        serverStartedAt: new Date('2026-07-01T12:00:00.000Z'),
      },
    });

    await expect(service.seek('room-1', 'host-1', 60)).resolves.toMatchObject({
      currentTime: 60,
      isPlaying: true,
    });
    expect(playbackRepo.updateState).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({
        baseCurrentTime: 60,
        isPlaying: true,
        serverStartedAt: new Date('2026-07-01T12:10:00.000Z'),
        serverPausedAt: null,
      }),
    );
  });

  it('changeTrack은 같은 Room 항목으로만 현재 트랙을 변경한다', async () => {
    const { service, playbackRepo } = makeFixture();

    await expect(service.changeTrack('room-1', 'host-1', 'playlist-item-1')).resolves.toMatchObject(
      {
        videoId: 'video-1',
        playlistItemId: 'playlist-item-1',
        currentTime: 0,
        isPlaying: true,
      },
    );
    expect(playbackRepo.updateState).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({
        videoId: 'video-1',
        playlistItemId: 'playlist-item-1',
        baseCurrentTime: 0,
        isPlaying: true,
      }),
    );
    expect(service.getPlayingRoomIds()).toContain('room-1');
  });

  it('changeTrack은 다른 Room 항목이면 PLAYLIST_ITEM_NOT_FOUND를 던진다', async () => {
    const { service, playbackRepo } = makeFixture({
      playlistLookup: { ...playlistLookup, roomId: 'other-room' },
    });

    await expect(service.changeTrack('room-1', 'host-1', 'playlist-item-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND,
    });
    expect(playbackRepo.updateState).not.toHaveBeenCalled();
  });

  it('changeTrack은 unavailable 항목이면 PLAYLIST_ITEM_NOT_FOUND를 던진다', async () => {
    const { service, playbackRepo } = makeFixture({
      playlistLookup: { ...playlistLookup, status: 'unavailable' },
    });

    await expect(service.changeTrack('room-1', 'host-1', 'playlist-item-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND,
    });
    expect(playbackRepo.updateState).not.toHaveBeenCalled();
  });

  it('Host가 아니면 재생 제어를 거부한다', async () => {
    const { service, playbackRepo } = makeFixture({ room: { ...room, hostId: 'host-1' } });

    await expect(service.pause('room-1', 'user-2', 10)).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(playbackRepo.updateState).not.toHaveBeenCalled();
  });

  it('reportError는 현재 트랙 영상이 여전히 존재하면 플레이리스트를 변경하지 않는다', async () => {
    const { service, playlistRepo, youtubeClient } = makeFixture();

    await expect(service.reportError('room-1', 'host-1', 'video-1', 150)).resolves.toEqual({
      errorPayload: { videoId: 'video-1', errorCode: 150 },
      playlist: null,
    });
    expect(youtubeClient.getVideoDetails).toHaveBeenCalledWith(['video-1']);
    expect(playlistRepo.markUnavailable).not.toHaveBeenCalled();
  });

  it('reportError는 삭제/비공개가 확인되면 unavailable 마킹 후 playlist payload를 반환한다', async () => {
    const { service, playlistRepo } = makeFixture({ videoDetails: [] });

    await service.play('room-1', 'host-1', 0);
    await expect(service.reportError('room-1', 'host-1', 'video-1', 150)).resolves.toEqual({
      errorPayload: { videoId: 'video-1', errorCode: 150 },
      playlist: [
        {
          id: 'playlist-item-1',
          videoId: 'video-1',
          title: 'Song One',
          channelTitle: 'Channel One',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          duration: 180,
          position: 1,
          addedBy: 'host-1',
          status: 'available',
        },
      ],
    });
    expect(playlistRepo.markUnavailable).toHaveBeenCalledWith('playlist-item-1');
    expect(playlistRepo.getPlaylist).toHaveBeenCalledWith('room-1');
    expect(service.getPlayingRoomIds()).toContain('room-1');
  });

  it('reportError는 stale 리포트이면 YouTube 재확인을 하지 않는다', async () => {
    const { service, youtubeClient, playlistRepo } = makeFixture();

    await expect(service.reportError('room-1', 'host-1', 'other-video', 150)).resolves.toEqual({
      errorPayload: { videoId: 'other-video', errorCode: 150 },
      playlist: null,
    });
    expect(youtubeClient.getVideoDetails).not.toHaveBeenCalled();
    expect(playlistRepo.markUnavailable).not.toHaveBeenCalled();
  });

  it('reportError는 YouTube API 실패 시 플레이리스트 상태를 변경하지 않는다', async () => {
    const { service, playlistRepo } = makeFixture({ youtubeReject: new Error('quota') });

    await expect(service.reportError('room-1', 'host-1', 'video-1', 150)).resolves.toEqual({
      errorPayload: { videoId: 'video-1', errorCode: 150 },
      playlist: null,
    });
    expect(playlistRepo.markUnavailable).not.toHaveBeenCalled();
  });

  it('시스템 트리거 setTrack/resetPlayback은 권한 검증 없이 상태를 갱신한다', async () => {
    const { service, roomRepo, playbackRepo } = makeFixture();

    await service.setTrack('room-1', 'video-2', 'playlist-item-2');
    await service.resetPlayback('room-1');

    expect(roomRepo.findRoomById).not.toHaveBeenCalled();
    expect(playbackRepo.updateState).toHaveBeenNthCalledWith(
      1,
      'room-1',
      expect.objectContaining({
        videoId: 'video-2',
        playlistItemId: 'playlist-item-2',
        baseCurrentTime: 0,
        isPlaying: true,
      }),
    );
    expect(playbackRepo.updateState).toHaveBeenNthCalledWith(
      2,
      'room-1',
      expect.objectContaining({
        videoId: null,
        playlistItemId: null,
        baseCurrentTime: 0,
        isPlaying: false,
      }),
    );
  });
});
