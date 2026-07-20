import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlaybackService } from './playback.service';
import type { ICache } from '../lib/cache/cache.interface';
import { PlaybackSessionStore } from '../lib/playback/playback-session.store';
import type { PlaylistItemRecord } from '../types/playlist';

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
  return { service, values };
}

describe('PlaybackService', () => {
  const services: PlaybackService[] = [];
  afterEach(() => services.splice(0).forEach((service) => service.shutdown()));

  it('DB 없이 기본 세션에서 첫 곡 재생과 버전 증가를 처리한다', async () => {
    const { service } = makeService();
    services.push(service);
    const result = await service.play('room-1', 'host', 0);
    expect(result.broadcastEvent).toBe('playback:change-track');
    expect(result.payload).toMatchObject({
      playlistItemId: 'item-1',
      isPlaying: true,
      playbackVersion: 1,
    });
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

  it('stale ended 보고는 전환하지 않는다', async () => {
    const { service } = makeService();
    services.push(service);
    await service.play('room-1', 'host', 0);
    await expect(service.reportEnded('room-1', 'host', 'item-1', 0)).resolves.toBeNull();
  });
});
