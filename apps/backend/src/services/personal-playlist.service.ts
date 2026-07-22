import { ERROR_CODES, type AddPersonalPlaylistItemRequest } from '@syfity/shared';

import { AppError } from '../errors/appError';
import { YOUTUBE_MUSIC_CATEGORY_ID, type IYouTubeClient } from '../lib/youtube/youtube.client';
import {
  PersonalPlaylistDuplicateVideoError,
  type IPersonalPlaylistRepository,
  type PersonalPlaylistItemRecord,
  type PersonalPlaylistRecord,
  type ReorderPersonalPlaylistItemInput,
} from '../types/personal-playlist';
import { assertOwnedPersonalPlaylist } from '../utils/personalPlaylistAccess';
import { resolveVideoId } from '../utils/resolveVideoId';

export class PersonalPlaylistService {
  constructor(
    private readonly repository: IPersonalPlaylistRepository,
    private readonly youtubeClient: Pick<IYouTubeClient, 'getVideoDetails'>,
  ) {}

  getPlaylists(userId: string): Promise<PersonalPlaylistRecord[]> {
    return this.repository.findPlaylistsByOwnerId(userId);
  }

  createPlaylist(userId: string, name: string): Promise<PersonalPlaylistRecord> {
    return this.repository.createPlaylist(userId, name);
  }

  async getPlaylistDetail(
    playlistId: string,
    userId: string,
  ): Promise<{ playlist: PersonalPlaylistRecord; items: PersonalPlaylistItemRecord[] }> {
    const playlist = await assertOwnedPersonalPlaylist(this.repository, playlistId, userId);
    const items = await this.repository.getItems(playlistId);
    return { playlist, items };
  }

  async renamePlaylist(
    playlistId: string,
    userId: string,
    name: string,
  ): Promise<PersonalPlaylistRecord> {
    await assertOwnedPersonalPlaylist(this.repository, playlistId, userId);
    return this.repository.updatePlaylistName(playlistId, name);
  }

  async deletePlaylist(playlistId: string, userId: string): Promise<void> {
    await assertOwnedPersonalPlaylist(this.repository, playlistId, userId);
    await this.repository.deletePlaylist(playlistId);
  }

  async addItem(
    playlistId: string,
    userId: string,
    request: AddPersonalPlaylistItemRequest,
  ): Promise<PersonalPlaylistItemRecord> {
    await assertOwnedPersonalPlaylist(this.repository, playlistId, userId);

    const videoId = resolveVideoId(request);
    const existing = await this.repository.findItemByPlaylistAndVideoId(playlistId, videoId);
    if (existing) {
      throw this.createDuplicateVideoError();
    }

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
    if (video.categoryId !== YOUTUBE_MUSIC_CATEGORY_ID) {
      throw new AppError(
        400,
        ERROR_CODES.PLAYLIST_NOT_MUSIC,
        '음악이 아닌 영상은 추가할 수 없습니다.',
      );
    }

    try {
      return await this.repository.addItem({
        personalPlaylistId: playlistId,
        videoId: video.videoId,
        title: video.title,
        channelTitle: video.channelTitle,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
      });
    } catch (error) {
      if (error instanceof PersonalPlaylistDuplicateVideoError) {
        throw this.createDuplicateVideoError();
      }
      throw error;
    }
  }

  async deleteItem(playlistId: string, userId: string, itemId: string): Promise<void> {
    await assertOwnedPersonalPlaylist(this.repository, playlistId, userId);
    const item = await this.repository.findItemById(itemId);
    if (item?.personalPlaylistId !== playlistId) {
      throw new AppError(
        404,
        ERROR_CODES.PERSONAL_PLAYLIST_ITEM_NOT_FOUND,
        '항목을 찾을 수 없습니다.',
      );
    }
    await this.repository.deleteItem(itemId);
  }

  async reorderItems(
    playlistId: string,
    userId: string,
    items: ReorderPersonalPlaylistItemInput[],
  ): Promise<PersonalPlaylistItemRecord[]> {
    await assertOwnedPersonalPlaylist(this.repository, playlistId, userId);

    const currentItems = await this.repository.getItems(playlistId);
    const currentIdSet = new Set(currentItems.map((item) => item.id));
    const requestIdSet = new Set(items.map((item) => item.id));
    const isSameSet =
      items.length === currentItems.length &&
      requestIdSet.size === currentIdSet.size &&
      [...requestIdSet].every((itemId) => currentIdSet.has(itemId));
    if (!isSameSet) {
      throw new AppError(
        404,
        ERROR_CODES.PERSONAL_PLAYLIST_ITEM_NOT_FOUND,
        '일부 항목을 찾을 수 없습니다.',
      );
    }

    const positions = items.map((item) => item.position).sort((left, right) => left - right);
    if (!positions.every((position, index) => position === index + 1)) {
      throw new AppError(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'position은 1부터 연속된 값이어야 합니다.',
      );
    }

    await this.repository.reorderItems(items);
    return this.repository.getItems(playlistId);
  }

  private createDuplicateVideoError(): AppError {
    return new AppError(
      409,
      ERROR_CODES.PERSONAL_PLAYLIST_DUPLICATE_VIDEO,
      '이미 추가된 곡입니다.',
    );
  }
}
