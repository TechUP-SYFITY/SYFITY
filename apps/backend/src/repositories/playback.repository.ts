import type { PrismaClient } from '../generated/prisma/client';
import type {
  IPlaybackRepository,
  PlaybackStateRecord,
  PlaybackStateUpdateData,
} from '../types/playback';

const PLAYBACK_STATE_SELECT = {
  videoId: true,
  playlistItemId: true,
  baseCurrentTime: true,
  isPlaying: true,
  serverStartedAt: true,
  serverPausedAt: true,
  updatedAt: true,
} as const;

export type PlaybackRepositoryPrisma = {
  playbackState: Pick<PrismaClient['playbackState'], 'findUnique' | 'update'>;
};

export class PlaybackRepository implements IPlaybackRepository {
  constructor(private readonly prisma: PlaybackRepositoryPrisma) {}

  findByRoomId(roomId: string): Promise<PlaybackStateRecord | null> {
    return this.prisma.playbackState.findUnique({
      where: { roomId },
      select: PLAYBACK_STATE_SELECT,
    });
  }

  updateState(roomId: string, data: PlaybackStateUpdateData): Promise<PlaybackStateRecord> {
    return this.prisma.playbackState.update({
      where: { roomId },
      data: {
        videoId: data.videoId,
        playlistItemId: data.playlistItemId,
        baseCurrentTime: data.baseCurrentTime,
        isPlaying: data.isPlaying,
        serverStartedAt: data.serverStartedAt,
        serverPausedAt: data.serverPausedAt,
      },
      select: PLAYBACK_STATE_SELECT,
    });
  }
}
