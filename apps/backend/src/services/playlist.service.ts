import { ERROR_CODES, type AddPlaylistItemRequest } from '@syfity/shared';

import type { PlaybackService } from './playback.service';
import type { YoutubeMetadataRefreshService } from './youtube-metadata-refresh.service';
import { AppError } from '../errors/appError';
import { YOUTUBE_MUSIC_CATEGORY_ID, type IYouTubeClient } from '../lib/youtube/youtube.client';
import { broadcastToRoom } from '../socket/broadcast';
import type { IPersonalPlaylistRepository } from '../types/personal-playlist';
import {
  toPlaylistItem,
  type IPlaylistRepository,
  PlaylistDuplicateVideoError,
  type PlaylistItemRecord,
  type ReorderPlaylistItemInput,
} from '../types/playlist';
import type { IRoomRepository } from '../types/room';
import { assertOwnedPersonalPlaylist } from '../utils/personalPlaylistAccess';
import { resolveVideoId } from '../utils/resolveVideoId';
import { assertActiveRoomMember, assertRoomHost } from '../utils/roomAccess';

type PlaylistPlaybackService = Pick<
  PlaybackService,
  'advanceAfterCurrentRemoved' | 'enqueueIfShuffled'
>;

type ImportPersonalPlaylistRepository = Pick<
  IPersonalPlaylistRepository,
  'findPlaylistById' | 'getItems'
>;

const METADATA_REFRESH_BATCH_SIZE = 100;

export class PlaylistService {
  constructor(
    private readonly playlistRepo: IPlaylistRepository,
    private readonly roomRepo: Pick<IRoomRepository, 'findRoomById' | 'findMembership'>,
    private readonly youtubeClient: Pick<IYouTubeClient, 'getVideoDetails'>,
    private readonly playbackService: PlaylistPlaybackService,
    private readonly personalPlaylistRepository: ImportPersonalPlaylistRepository,
    private readonly metadataRefreshService: Pick<
      YoutubeMetadataRefreshService,
      'refreshVideoMetadata'
    >,
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

    const videoId = resolveVideoId(request);
    const existingItem = await this.playlistRepo.findItemByRoomAndVideoId(roomId, videoId);
    if (existingItem) {
      throw this.createDuplicateVideoError();
    }

    const [video] = await this.youtubeClient.getVideoDetails([videoId]);
    if (!video || video.duration === 0) {
      throw new AppError(400, ERROR_CODES.PLAYLIST_VIDEO_UNAVAILABLE, '재생할 수 없는 영상입니다.');
    }
    if (!video.embeddable || video.madeForKids) {
      throw new AppError(
        400,
        ERROR_CODES.PLAYLIST_VIDEO_UNAVAILABLE,
        '임베드가 금지된 영상입니다.',
      );
    }
    if (video.categoryId !== YOUTUBE_MUSIC_CATEGORY_ID) {
      throw new AppError(
        400,
        ERROR_CODES.PLAYLIST_NOT_MUSIC,
        '음악이 아닌 영상은 추가할 수 없습니다.',
      );
    }

    let item: PlaylistItemRecord;
    try {
      item = await this.playlistRepo.addItem({
        roomId,
        videoId: video.videoId,
        title: video.title,
        channelTitle: video.channelTitle,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        addedBy: userId,
      });
    } catch (error) {
      if (error instanceof PlaylistDuplicateVideoError) {
        throw this.createDuplicateVideoError();
      }
      throw error;
    }

    await this.playbackService.enqueueIfShuffled(roomId, item.id);

    const playlist = await this.playlistRepo.getPlaylist(roomId);
    broadcastToRoom(roomId, 'playlist:updated', {
      playlist: playlist.map(toPlaylistItem),
    });

    return item;
  }

  async refreshStaleMetadata(
    cutoff: Date,
  ): Promise<{ checkedCount: number; unavailableCount: number }> {
    let cursor: { id: string; metadataRefreshedAt: Date } | undefined;
    let checkedCount = 0;
    let unavailableCount = 0;

    for (;;) {
      const staleItems = await this.playlistRepo.findStaleMetadataItems(cutoff, cursor);
      if (staleItems.length === 0) return { checkedCount, unavailableCount };

      const refreshed = await this.metadataRefreshService.refreshVideoMetadata([
        ...new Set(staleItems.map((item) => item.videoId)),
      ]);
      const updates = staleItems.map((item) => ({
        id: item.id,
        result: refreshed.get(item.videoId) ?? { status: 'unavailable' as const },
      }));
      await this.playlistRepo.applyMetadataRefresh(updates);
      checkedCount += staleItems.length;
      unavailableCount += updates.filter((item) => item.result.status === 'unavailable').length;
      if (staleItems.length < METADATA_REFRESH_BATCH_SIZE) {
        return { checkedCount, unavailableCount };
      }
      const lastItem = staleItems[staleItems.length - 1]!;
      cursor = { id: lastItem.id, metadataRefreshedAt: lastItem.metadataRefreshedAt };
    }
  }

  async reorderPlaylist(
    roomId: string,
    userId: string,
    items: ReorderPlaylistItemInput[],
  ): Promise<void> {
    await assertRoomHost(this.roomRepo, roomId, userId);

    const currentPlaylist = await this.playlistRepo.getPlaylist(roomId);
    const currentIdSet = new Set(currentPlaylist.map((item) => item.id));
    const requestIdSet = new Set(items.map((item) => item.id));
    const isSameSet =
      items.length === currentPlaylist.length &&
      requestIdSet.size === currentIdSet.size &&
      [...requestIdSet].every((id) => currentIdSet.has(id));

    if (!isSameSet) {
      throw new AppError(404, ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND, '일부 항목을 찾을 수 없습니다.');
    }

    const positions = items.map((item) => item.position).sort((left, right) => left - right);
    if (!positions.every((position, index) => position === index + 1)) {
      throw new AppError(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'position은 1부터 연속된 값이어야 합니다.',
      );
    }

    await this.playlistRepo.reorderItems(items);
    const playlist = await this.playlistRepo.getPlaylist(roomId);
    broadcastToRoom(roomId, 'playlist:updated', {
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

    const transition = await this.playbackService.advanceAfterCurrentRemoved(roomId, itemId);

    await this.playlistRepo.deleteItem(itemId);
    const updatedPlaylist = await this.playlistRepo.getPlaylist(roomId);

    if (transition) {
      broadcastToRoom(roomId, transition.broadcastEvent, transition.payload);
    }
    broadcastToRoom(roomId, 'playlist:updated', {
      playlist: updatedPlaylist.map(toPlaylistItem),
    });
  }

  async importFromPersonalPlaylist(
    roomId: string,
    userId: string,
    personalPlaylistId: string,
  ): Promise<{ addedCount: number; duplicateCount: number; unavailableCount: number }> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    await assertOwnedPersonalPlaylist(this.personalPlaylistRepository, personalPlaylistId, userId);

    const sourceItems = await this.personalPlaylistRepository.getItems(personalPlaylistId);
    let result;
    try {
      result = await this.playlistRepo.importItems(roomId, sourceItems, userId);
    } catch (error) {
      if (error instanceof PlaylistDuplicateVideoError) {
        throw this.createDuplicateVideoError();
      }
      throw error;
    }

    for (const item of result.addedItems) {
      await this.playbackService.enqueueIfShuffled(roomId, item.id);
    }

    const playlist = await this.playlistRepo.getPlaylist(roomId);
    broadcastToRoom(roomId, 'playlist:updated', { playlist: playlist.map(toPlaylistItem) });

    return {
      addedCount: result.addedItems.length,
      duplicateCount: result.duplicateCount,
      unavailableCount: result.unavailableCount,
    };
  }

  private createDuplicateVideoError(): AppError {
    return new AppError(
      409,
      ERROR_CODES.PLAYLIST_DUPLICATE_VIDEO,
      '이미 플레이리스트에 추가된 곡입니다.',
    );
  }
}
