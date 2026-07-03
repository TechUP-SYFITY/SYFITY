import type { PrismaClient } from '../generated/prisma/client';
import type {
  AddPlaylistItemData,
  IPlaylistRepository,
  PlaylistItemRecord,
} from '../types/playlist';

const PLAYLIST_ITEM_SELECT = {
  id: true,
  videoId: true,
  title: true,
  channelTitle: true,
  thumbnailUrl: true,
  duration: true,
  position: true,
  addedBy: true,
  status: true,
  addedAt: true,
} as const;

export type PlaylistRepositoryPrisma = {
  playlistItem: Pick<PrismaClient['playlistItem'], 'findMany' | 'aggregate' | 'create'>;
};

export class PlaylistRepository implements IPlaylistRepository {
  constructor(private readonly prisma: PlaylistRepositoryPrisma) {}

  getPlaylist(roomId: string): Promise<PlaylistItemRecord[]> {
    return this.prisma.playlistItem.findMany({
      where: { roomId },
      orderBy: { position: 'asc' },
      select: PLAYLIST_ITEM_SELECT,
    });
  }

  async getMaxPosition(roomId: string): Promise<number | null> {
    const result = await this.prisma.playlistItem.aggregate({
      where: { roomId },
      _max: { position: true },
    });

    return result._max.position;
  }

  addItem(data: AddPlaylistItemData): Promise<PlaylistItemRecord> {
    return this.prisma.playlistItem.create({
      data: {
        roomId: data.roomId,
        videoId: data.videoId,
        title: data.title,
        channelTitle: data.channelTitle,
        thumbnailUrl: data.thumbnailUrl,
        duration: data.duration,
        position: data.position,
        addedBy: data.addedBy,
        status: 'available',
        addedAt: new Date(),
      },
      select: PLAYLIST_ITEM_SELECT,
    });
  }
}
