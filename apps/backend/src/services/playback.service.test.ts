import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlaybackService } from './playback.service';
import type { ICache } from '../lib/cache/cache.interface';
import { getIo } from '../lib/io';
import { PlaybackSessionStore } from '../lib/playback/playback-session.store';
import type { PlaylistItemRecord } from '../types/playlist';

vi.mock('../lib/io', () => ({ getIo: vi.fn() }));

const playlist: PlaylistItemRecord[] = [
  {
    id: 'item-1',
    videoId: 'video-1',
    title: 'One',
    channelTitle: 'Channel',
    thumbnailUrl: '',
    duration: 180,
    position: 1,
    addedBy: 'host',
    status: 'available',
    addedAt: new Date(),
  },
  {
    id: 'item-2',
    videoId: 'video-2',
    title: 'Two',
    channelTitle: 'Channel',
    thumbnailUrl: '',
    duration: 180,
    position: 2,
    addedBy: 'host',
    status: 'available',
    addedAt: new Date(),
  },
  {
    id: 'item-3',
    videoId: 'video-3',
    title: 'Three',
    channelTitle: 'Channel',
    thumbnailUrl: '',
    duration: 180,
    position: 3,
    addedBy: 'host',
    status: 'available',
    addedAt: new Date(),
  },
];

function makeService() {
  const values = new Map<string, unknown>();
  const cache: ICache = {
    get: <T>(key: string) => values.get(key) as T | undefined,
    set: vi.fn((key, value) => values.set(key, value)),
    del: vi.fn((key) => values.delete(key)),
    has: vi.fn((key) => values.has(key)),
  };
  const roomRepo = {
    findRoomById: vi.fn().mockResolvedValue({ id: 'room-1', hostId: 'host', status: 'active' }),
    findMembership: vi.fn().mockResolvedValue({ role: 'host', status: 'online' }),
    touchLastActivity: vi.fn().mockResolvedValue(undefined),
  };
  const playlistRepo = {
    getPlaylist: vi.fn().mockResolvedValue(playlist),
    findItemById: vi.fn((id: string) => {
      const found = playlist.find((item) => item.id === id);
      return Promise.resolve(
        found
          ? {
              id: found.id,
              roomId: 'room-1',
              videoId: found.videoId,
              duration: found.duration,
              position: found.position,
              addedBy: found.addedBy,
              status: found.status,
            }
          : null,
      );
    }),
    markUnavailable: vi.fn().mockResolvedValue(undefined),
  };
  const service = new PlaybackService(roomRepo, playlistRepo, new PlaybackSessionStore(cache), {
    getVideoDetails: vi.fn().mockResolvedValue([]),
  });
  return { service, values, playlistRepo };
}

describe('PlaybackService', () => {
  const services: PlaybackService[] = [];
  afterEach(() => services.splice(0).forEach((service) => service.shutdown()));

  it('DB 없이 기본 세션에서 첫 곡 재생과 버전 증가를 처리한다', async () => {
    const { service, playlistRepo } = makeService();
    services.push(service);
    const result = await service.play('room-1', 'host', 0);
    expect(result.broadcastEvent).toBe('playback:change-track');
    expect(result.payload).toMatchObject({
      playlistItemId: 'item-1',
      isPlaying: true,
      playbackVersion: 1,
    });
    expect(playlistRepo.getPlaylist).toHaveBeenCalledTimes(1);
  });

  it('이미 조회한 곡 정보로 전환하면 Playlist를 다시 조회하지 않는다', async () => {
    const { service, playlistRepo } = makeService();
    services.push(service);
    await service.selectTrack('room-1', 'host', 'item-2');
    expect(playlistRepo.getPlaylist).not.toHaveBeenCalled();

    await service.play('room-1', 'host', 0);
    playlistRepo.getPlaylist.mockClear();
    await service.nextTrack('room-1', 'host');
    expect(playlistRepo.getPlaylist).toHaveBeenCalledTimes(1);
  });

  it('한 곡 반복은 자동 종료에서 같은 곡을 반복하지만 수동 next는 다음 곡으로 이동한다', async () => {
    const { service } = makeService();
    services.push(service);
    const first = await service.play('room-1', 'host', 0);
    await service.updateSettings('room-1', 'host', { repeatMode: 'one' });
    const automatic = await service.reportEnded(
      'room-1',
      'host',
      'item-1',
      first.payload.playbackVersion + 1,
    );
    expect(automatic?.payload.playlistItemId).toBe('item-1');
    const manual = await service.nextTrack('room-1', 'host');
    expect(manual.payload.playlistItemId).toBe('item-2');
  });

  it.each(['off', 'all', 'one'] as const)(
    '수동 next는 셔플 없이 반복 모드 %s에서 마지막 곡을 첫 곡으로 순환한다',
    async (repeatMode) => {
      const { service } = makeService();
      services.push(service);
      await service.selectTrack('room-1', 'host', 'item-3');
      await service.updateSettings('room-1', 'host', { repeatMode });

      await expect(service.nextTrack('room-1', 'host')).resolves.toMatchObject({
        payload: { playlistItemId: 'item-1', isPlaying: true },
      });
    },
  );

  it('수동 next는 셔플 큐를 순서대로 소비한다', async () => {
    const { service, values } = makeService();
    services.push(service);
    await service.play('room-1', 'host', 0);
    await service.updateSettings('room-1', 'host', { shuffleEnabled: true });
    const sessionBefore = [...values.values()][0] as { remainingPlaylistItemIds: string[] };
    const [expectedItemId, ...expectedRemainingQueue] = sessionBefore.remainingPlaylistItemIds;

    await expect(service.nextTrack('room-1', 'host')).resolves.toMatchObject({
      payload: { playlistItemId: expectedItemId },
    });
    const sessionAfter = [...values.values()][0] as { remainingPlaylistItemIds: string[] };
    expect(sessionAfter.remainingPlaylistItemIds).toEqual(expectedRemainingQueue);
  });

  it.each(['off', 'all', 'one'] as const)(
    '수동 next는 셔플 큐 소진 뒤 반복 모드 %s에서 현재 곡을 건너뛴 새 사이클을 만든다',
    async (repeatMode) => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0);
      const { service, values } = makeService();
      services.push(service);
      await service.selectTrack('room-1', 'host', 'item-1');
      await service.updateSettings('room-1', 'host', { repeatMode, shuffleEnabled: true });
      await service.nextTrack('room-1', 'host');
      await service.nextTrack('room-1', 'host');
      const exhaustedSession = [...values.values()][0] as {
        playlistItemId: string;
        remainingPlaylistItemIds: string[];
        shuffleCycle: number;
      };
      expect(exhaustedSession.remainingPlaylistItemIds).toEqual([]);

      randomSpy.mockReturnValueOnce(0.9).mockReturnValueOnce(0);
      const result = await service.nextTrack('room-1', 'host');
      const nextSession = [...values.values()][0] as {
        remainingPlaylistItemIds: string[];
        shuffleCycle: number;
      };

      expect(result.payload.playlistItemId).not.toBe(exhaustedSession.playlistItemId);
      expect(nextSession.shuffleCycle).toBe(2);
      expect(nextSession.remainingPlaylistItemIds).toHaveLength(1);
      randomSpy.mockRestore();
    },
  );

  it('셔플 큐는 현재 곡을 제외한 중복 없는 남은 곡을 만든다', async () => {
    const { service, values } = makeService();
    services.push(service);
    await service.play('room-1', 'host', 0);
    await service.updateSettings('room-1', 'host', { shuffleEnabled: true });
    const session = [...values.values()][0] as { remainingPlaylistItemIds: string[] };
    expect(session.remainingPlaylistItemIds).toHaveLength(2);
    expect(new Set(session.remainingPlaylistItemIds).size).toBe(2);
    expect(session.remainingPlaylistItemIds).not.toContain('item-1');
  });

  it('셔플 중 추가한 곡을 남은 큐에 정확히 한 번 삽입한다', async () => {
    const { service, values } = makeService();
    services.push(service);
    await service.play('room-1', 'host', 0);
    await service.updateSettings('room-1', 'host', { shuffleEnabled: true });

    await service.enqueueIfShuffled('room-1', 'item-4');

    const session = [...values.values()][0] as {
      playlistItemId: string;
      remainingPlaylistItemIds: string[];
    };
    expect(session.playlistItemId).toBe('item-1');
    expect(session.remainingPlaylistItemIds).toContain('item-4');
    expect(session.remainingPlaylistItemIds.filter((id) => id === 'item-4')).toHaveLength(1);
  });

  it('현재 곡이 아닌 삭제 대상은 셔플 큐와 재생 이력에서 모두 제거한다', async () => {
    const { service, values } = makeService();
    services.push(service);
    await service.selectTrack('room-1', 'host', 'item-1');
    await service.selectTrack('room-1', 'host', 'item-2');
    await service.selectTrack('room-1', 'host', 'item-3');
    await service.updateSettings('room-1', 'host', { shuffleEnabled: true });

    await expect(service.advanceAfterCurrentRemoved('room-1', 'item-2')).resolves.toBeNull();

    const session = [...values.values()][0] as {
      playlistItemId: string;
      remainingPlaylistItemIds: string[];
      playbackHistoryItemIds: string[];
    };
    expect(session.playlistItemId).toBe('item-3');
    expect(session.remainingPlaylistItemIds).not.toContain('item-2');
    expect(session.playbackHistoryItemIds).not.toContain('item-2');
  });

  it('stale ended 보고는 전환하지 않는다', async () => {
    const { service } = makeService();
    services.push(service);
    await service.play('room-1', 'host', 0);
    await expect(service.reportEnded('room-1', 'host', 'item-1', 0)).resolves.toBeNull();
  });

  it('3초 미만이고 이력이 있으면 이전 곡으로 이동하고, 3초 이상이면 현재 곡을 재시작한다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T00:00:00.000Z'));
    const { service } = makeService();
    services.push(service);
    await service.play('room-1', 'host', 0);
    await service.nextTrack('room-1', 'host');

    await expect(service.previousTrack('room-1', 'host')).resolves.toMatchObject({
      payload: { playlistItemId: 'item-1', currentTime: 0 },
    });

    await service.nextTrack('room-1', 'host');
    vi.setSystemTime(new Date('2026-07-20T00:00:04.000Z'));
    await expect(service.previousTrack('room-1', 'host')).resolves.toMatchObject({
      payload: { playlistItemId: 'item-2', currentTime: 0 },
    });
    vi.useRealTimers();
  });

  it('자동 종료 타이머는 곡 길이와 1초 마진 뒤 다음 곡을 한 번 broadcast한다', async () => {
    vi.useFakeTimers();
    const roomEmit = vi.fn();
    vi.mocked(getIo).mockReturnValue({ to: vi.fn(() => ({ emit: roomEmit })) } as never);
    const { service } = makeService();
    services.push(service);
    await service.play('room-1', 'host', 0);

    await vi.advanceTimersByTimeAsync(181_000);

    expect(roomEmit).toHaveBeenCalledWith(
      'playback:change-track',
      expect.objectContaining({ playlistItemId: 'item-2', playbackVersion: 2 }),
    );
    vi.useRealTimers();
  });

  it('종료 보고가 먼저 전환하면 stale 자동 종료 타이머는 다시 broadcast하지 않는다', async () => {
    vi.useFakeTimers();
    const roomEmit = vi.fn();
    vi.mocked(getIo).mockReturnValue({ to: vi.fn(() => ({ emit: roomEmit })) } as never);
    const { service } = makeService();
    services.push(service);
    const first = await service.play('room-1', 'host', 0);
    await vi.advanceTimersByTimeAsync(1_000);
    await service.reportEnded('room-1', 'host', 'item-1', first.payload.playbackVersion);

    await vi.advanceTimersByTimeAsync(180_000);

    expect(roomEmit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
