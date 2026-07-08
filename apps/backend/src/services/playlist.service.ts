import { ERROR_CODES, type AddPlaylistItemRequest, type PlaylistItem } from '@syfity/shared';

import type { PlaybackService } from './playback.service';
import { AppError } from '../errors/appError';
import type { IYouTubeClient } from '../lib/youtube/youtube.client';
import {
  toPlaylistItem,
  type IPlaylistRepository,
  type PlaylistItemRecord,
  type ReorderPlaylistItemInput,
} from '../types/playlist';
import type { IRoomRepository } from '../types/room';
import type { PlaybackStatePayload } from '../types/socket';
import { assertActiveRoomMember, assertRoomHost } from '../utils/roomAccess';

type PlaylistRoomEmitter = {
  emit(event: 'playlist:updated', payload: { playlist: PlaylistItem[] }): boolean;
  emit(event: 'playback:change-track' | 'playback:pause', payload: PlaybackStatePayload): boolean;
};

export type PlaylistSocketServer = {
  to(room: string): PlaylistRoomEmitter;
};

type PlaylistPlaybackService = Pick<
  PlaybackService,
  'getPlaybackState' | 'setTrack' | 'resetPlayback'
>;

export class PlaylistService {
  constructor(
    private readonly playlistRepo: IPlaylistRepository,
    private readonly roomRepo: Pick<
      IRoomRepository,
      'findRoomById' | 'touchLastActivity' | 'findMembership'
    >,
    private readonly youtubeClient: Pick<IYouTubeClient, 'getVideoDetails'>,
    private readonly io: PlaylistSocketServer,
    private readonly playbackService: PlaylistPlaybackService,
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

    const item = await this.playlistRepo.addItem({
      roomId,
      videoId: video.videoId,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      addedBy: userId,
    });

    await this.roomRepo.touchLastActivity(roomId);

    const playlist = await this.playlistRepo.getPlaylist(roomId);
    this.io.to(`room:${roomId}`).emit('playlist:updated', {
      playlist: playlist.map(toPlaylistItem),
    });

    return item;
  }

  async reorderPlaylist(
    roomId: string,
    userId: string,
    items: ReorderPlaylistItemInput[],
  ): Promise<void> {
    await assertRoomHost(this.roomRepo, roomId, userId);

    // getPlaylist는 position ASC로만 정렬하므로 값이 중복되면 동률 항목의 순서가 보장되지 않는다.
    const positionSet = new Set(items.map((item) => item.position));
    if (positionSet.size !== items.length) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, '중복된 position 값이 있습니다.');
    }

    const currentPlaylist = await this.playlistRepo.getPlaylist(roomId);
    const currentIdSet = new Set(currentPlaylist.map((item) => item.id));
    const requestIdSet = new Set(items.map((item) => item.id));
    const isSameSet =
      requestIdSet.size === currentIdSet.size &&
      [...requestIdSet].every((id) => currentIdSet.has(id));

    if (!isSameSet) {
      throw new AppError(404, ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND, '일부 항목을 찾을 수 없습니다.');
    }

    await this.playlistRepo.reorderItems(items);
    await this.roomRepo.touchLastActivity(roomId);

    const playlist = await this.playlistRepo.getPlaylist(roomId);
    this.io.to(`room:${roomId}`).emit('playlist:updated', {
      playlist: playlist.map(toPlaylistItem),
    });
  }

  async deleteItem(roomId: string, userId: string, itemId: string): Promise<void> {
    const room = await assertActiveRoomMember(this.roomRepo, roomId, userId);

    const item = await this.playlistRepo.findItemById(itemId);
    if (item?.roomId !== roomId) {
      throw new AppError(404, ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND, '항목을 찾을 수 없습니다.');
    }

    const isHost = room.hostId === userId;
    if (!isHost && item.addedBy !== userId) {
      throw new AppError(
        403,
        ERROR_CODES.AUTH_FORBIDDEN,
        '다른 사용자가 추가한 곡은 삭제할 수 없습니다.',
      );
    }

    const playbackState = await this.playbackService.getPlaybackState(roomId);
    if (!playbackState) {
      throw new AppError(
        500,
        ERROR_CODES.SERVER_INTERNAL_ERROR,
        'PlaybackState를 찾을 수 없습니다.',
      );
    }

    const isCurrentTrack = playbackState.playlistItemId === itemId;
    let statePayload: PlaybackStatePayload | null = null;
    let broadcastEvent: 'playback:change-track' | 'playback:pause' | null = null;

    if (isCurrentTrack) {
      const currentPlaylist = await this.playlistRepo.getPlaylist(roomId);
      const nextItem =
        currentPlaylist.find(
          (candidate) => candidate.position > item.position && candidate.status === 'available',
        ) ?? null;

      if (nextItem) {
        statePayload = await this.playbackService.setTrack(roomId, nextItem.videoId, nextItem.id);
        broadcastEvent = 'playback:change-track';
      } else {
        statePayload = await this.playbackService.resetPlayback(roomId);
        broadcastEvent = 'playback:pause';
      }
    }

    await this.playlistRepo.deleteItem(itemId);
    await this.roomRepo.touchLastActivity(roomId);

    const updatedPlaylist = await this.playlistRepo.getPlaylist(roomId);

    if (broadcastEvent && statePayload) {
      this.io.to(`room:${roomId}`).emit(broadcastEvent, statePayload);
    }
    this.io.to(`room:${roomId}`).emit('playlist:updated', {
      playlist: updatedPlaylist.map(toPlaylistItem),
    });
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
