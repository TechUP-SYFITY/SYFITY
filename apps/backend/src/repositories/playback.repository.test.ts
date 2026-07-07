import { describe, expect, it, vi } from 'vitest';

import { PlaybackRepository, type PlaybackRepositoryPrisma } from './playback.repository';
import type { PlaybackStateRecord, PlaybackStateUpdateData } from '../types/playback';

const playbackState: PlaybackStateRecord = {
  videoId: 'video-1',
  playlistItemId: 'playlist-item-1',
  baseCurrentTime: 30,
  isPlaying: true,
  serverStartedAt: new Date('2026-07-01T12:00:00.000Z'),
  serverPausedAt: null,
  updatedAt: new Date('2026-07-01T12:00:01.000Z'),
};

const PLAYBACK_STATE_SELECT = {
  videoId: true,
  playlistItemId: true,
  baseCurrentTime: true,
  isPlaying: true,
  serverStartedAt: true,
  serverPausedAt: true,
  updatedAt: true,
};

function makePrisma(
  overrides: {
    findUniqueResult?: PlaybackStateRecord | null;
    updateResult?: PlaybackStateRecord;
  } = {},
): PlaybackRepositoryPrisma {
  return {
    playbackState: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          'findUniqueResult' in overrides ? overrides.findUniqueResult : playbackState,
        ),
      update: vi.fn().mockResolvedValue(overrides.updateResult ?? playbackState),
    },
  };
}

describe('PlaybackRepository', () => {
  it('Room ID로 PlaybackState를 조회한다', async () => {
    const prisma = makePrisma({ findUniqueResult: playbackState });
    const repo = new PlaybackRepository(prisma);

    await expect(repo.findByRoomId('room-1')).resolves.toEqual(playbackState);

    expect(prisma.playbackState.findUnique).toHaveBeenCalledWith({
      where: { roomId: 'room-1' },
      select: PLAYBACK_STATE_SELECT,
    });
  });

  it('PlaybackState가 없으면 null을 반환한다', async () => {
    const prisma = makePrisma({ findUniqueResult: null });
    const repo = new PlaybackRepository(prisma);

    await expect(repo.findByRoomId('room-1')).resolves.toBeNull();
  });

  it('PlaybackState를 갱신한다', async () => {
    const prisma = makePrisma();
    const repo = new PlaybackRepository(prisma);
    const data: PlaybackStateUpdateData = {
      videoId: 'video-2',
      playlistItemId: 'playlist-item-2',
      baseCurrentTime: 0,
      isPlaying: true,
      serverStartedAt: new Date('2026-07-01T12:10:00.000Z'),
      serverPausedAt: null,
    };

    await expect(repo.updateState('room-1', data)).resolves.toEqual(playbackState);

    expect(prisma.playbackState.update).toHaveBeenCalledWith({
      where: { roomId: 'room-1' },
      data,
      select: PLAYBACK_STATE_SELECT,
    });
  });

  it('트랙 초기화 값의 null을 생략하지 않고 전달한다', async () => {
    const prisma = makePrisma();
    const repo = new PlaybackRepository(prisma);
    const data: PlaybackStateUpdateData = {
      videoId: null,
      playlistItemId: null,
      baseCurrentTime: 0,
      isPlaying: false,
      serverStartedAt: null,
      serverPausedAt: new Date('2026-07-01T12:10:00.000Z'),
    };

    await repo.updateState('room-1', data);

    expect(prisma.playbackState.update).toHaveBeenCalledWith({
      where: { roomId: 'room-1' },
      data,
      select: PLAYBACK_STATE_SELECT,
    });
  });
});
