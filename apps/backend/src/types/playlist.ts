import type { PlaylistItem } from '@syfity/shared';

import type { PersonalPlaylistItemRecord } from './personal-playlist';

export type PlaylistItemRecord = {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
  position: number;
  addedBy: string;
  status: 'available' | 'unavailable';
  addedAt: Date;
  metadataRefreshedAt?: Date;
};

export type AddPlaylistItemData = {
  roomId: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
  addedBy: string;
};

export type PlaylistItemLookupRecord = {
  id: string;
  roomId: string;
  videoId: string;
  duration: number;
  position: number;
  addedBy: string;
  status: 'available' | 'unavailable';
};

export type ReorderPlaylistItemInput = {
  id: string;
  position: number;
};

export type ImportPlaylistItemsResult = {
  addedItems: PlaylistItemRecord[];
  duplicateCount: number;
  unavailableCount: number;
};

export class PlaylistDuplicateVideoError extends Error {}

export interface IPlaylistRepository {
  getPlaylist(roomId: string): Promise<PlaylistItemRecord[]>;
  addItem(data: AddPlaylistItemData): Promise<PlaylistItemRecord>;
  findItemByRoomAndVideoId(roomId: string, videoId: string): Promise<PlaylistItemRecord | null>;
  findItemById(itemId: string): Promise<PlaylistItemLookupRecord | null>;
  markUnavailable(itemId: string): Promise<void>;
  deleteItem(itemId: string): Promise<void>;
  reorderItems(items: ReorderPlaylistItemInput[]): Promise<void>;
  importItems(
    roomId: string,
    sourceItems: PersonalPlaylistItemRecord[],
    addedBy: string,
  ): Promise<ImportPlaylistItemsResult>;
}

export function toPlaylistItem(item: PlaylistItemRecord): PlaylistItem {
  return {
    id: item.id,
    videoId: item.videoId,
    title: item.title,
    channelTitle: item.channelTitle,
    thumbnailUrl: item.thumbnailUrl,
    duration: item.duration,
    position: item.position,
    addedBy: item.addedBy,
    status: item.status,
  };
}
