import { ERROR_CODES, type AddPlaylistItemRequest, type PlaylistItem } from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { IYouTubeClient } from '../lib/youtube/youtube.client';
import {
  toPlaylistItem,
  type IPlaylistRepository,
  type PlaylistItemRecord,
} from '../types/playlist';
import type { IRoomRepository } from '../types/room';
import { assertActiveRoomMember } from '../utils/roomAccess';

type PlaylistRoomEmitter = {
  emit(event: 'playlist:updated', payload: { playlist: PlaylistItem[] }): boolean;
};

export type PlaylistSocketServer = {
  to(room: string): PlaylistRoomEmitter;
};

export class PlaylistService {
  constructor(
    private readonly playlistRepo: IPlaylistRepository,
    private readonly roomRepo: Pick<
      IRoomRepository,
      'findRoomById' | 'touchLastActivity' | 'findMembership'
    >,
    private readonly youtubeClient: Pick<IYouTubeClient, 'getVideoDetails'>,
    private readonly io: PlaylistSocketServer,
  ) {}

  async getPlaylist(roomId: string, userId: string): Promise<PlaylistItemRecord[]> {
    await assertActiveRoomMember(this.roomRepo, roomId, userId);

    return this.playlistRepo.getPlaylist(roomId);
  }

  async addItem(
    roomId: string,
    userId: string,
    request: AddPlaylistItemRequest,
  ): Promise<PlaylistItemRecord> {
    await assertActiveRoomMember(this.roomRepo, roomId, userId);

    const videoId = this.resolveVideoId(request);
    const [video] = await this.youtubeClient.getVideoDetails([videoId]);
    if (!video || video.duration === 0) {
      throw new AppError(400, ERROR_CODES.PLAYLIST_VIDEO_UNAVAILABLE, '재생할 수 없는 영상입니다.');
    }
    if (!video.embeddable) {
      throw new AppError(
        400,
        ERROR_CODES.PLAYLIST_VIDEO_UNAVAILABLE,
        '임베드가 금지된 영상입니다.',
      );
    }

    const maxPosition = await this.playlistRepo.getMaxPosition(roomId);
    const item = await this.playlistRepo.addItem({
      roomId,
      videoId: video.videoId,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      position: maxPosition === null ? 1 : maxPosition + 1,
      addedBy: userId,
    });

    await this.roomRepo.touchLastActivity(roomId);

    const playlist = await this.playlistRepo.getPlaylist(roomId);
    this.io.to(`room:${roomId}`).emit('playlist:updated', {
      playlist: playlist.map(toPlaylistItem),
    });

    return item;
  }

  private resolveVideoId(request: AddPlaylistItemRequest): string {
    if (request.videoId) {
      return request.videoId;
    }

    if (!request.youtubeUrl) {
      throw new AppError(400, ERROR_CODES.PLAYLIST_INVALID_URL, 'YouTube URL이 올바르지 않습니다.');
    }

    const videoId = this.parseVideoId(request.youtubeUrl);
    if (!videoId) {
      throw new AppError(400, ERROR_CODES.PLAYLIST_INVALID_URL, 'YouTube URL이 올바르지 않습니다.');
    }

    return videoId;
  }

  private parseVideoId(url: string): string | null {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }

    if (parsed.hostname === 'youtu.be') {
      return this.nonEmpty(parsed.pathname.split('/')[1]);
    }

    if (parsed.hostname !== 'youtube.com' && parsed.hostname !== 'www.youtube.com') {
      return null;
    }

    if (parsed.pathname === '/watch') {
      return this.nonEmpty(parsed.searchParams.get('v'));
    }

    if (parsed.pathname.startsWith('/embed/')) {
      return this.nonEmpty(parsed.pathname.split('/')[2]);
    }

    if (parsed.pathname.startsWith('/shorts/')) {
      return this.nonEmpty(parsed.pathname.split('/')[2]);
    }

    return null;
  }

  private nonEmpty(value: string | null | undefined): string | null {
    return value === undefined || value === null || value === '' ? null : value;
  }
}
