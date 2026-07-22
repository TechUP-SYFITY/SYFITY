export type PersonalPlaylistRecord = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PersonalPlaylistItemRecord = {
  id: string;
  personalPlaylistId: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
  position: number;
  status: 'available' | 'unavailable';
  addedAt: Date;
  metadataRefreshedAt?: Date;
};

export type AddPersonalPlaylistItemData = {
  personalPlaylistId: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
};

export type ReorderPersonalPlaylistItemInput = { id: string; position: number };
export type StalePersonalPlaylistMetadataItem = { id: string; videoId: string };

export class PersonalPlaylistDuplicateVideoError extends Error {}

export interface IPersonalPlaylistRepository {
  findPlaylistsByOwnerId(ownerId: string): Promise<PersonalPlaylistRecord[]>;
  createPlaylist(ownerId: string, name: string): Promise<PersonalPlaylistRecord>;
  findPlaylistById(playlistId: string): Promise<PersonalPlaylistRecord | null>;
  updatePlaylistName(playlistId: string, name: string): Promise<PersonalPlaylistRecord>;
  deletePlaylist(playlistId: string): Promise<void>;
  getItems(playlistId: string): Promise<PersonalPlaylistItemRecord[]>;
  addItem(data: AddPersonalPlaylistItemData): Promise<PersonalPlaylistItemRecord>;
  findItemByPlaylistAndVideoId(
    playlistId: string,
    videoId: string,
  ): Promise<PersonalPlaylistItemRecord | null>;
  findItemById(itemId: string): Promise<PersonalPlaylistItemRecord | null>;
  deleteItem(itemId: string): Promise<void>;
  reorderItems(items: ReorderPersonalPlaylistItemInput[]): Promise<void>;
  deleteAllByOwnerId(ownerId: string): Promise<void>;
  findStaleMetadataItems(cutoff: Date): Promise<StalePersonalPlaylistMetadataItem[]>;
  applyMetadataRefresh(items: Array<{ id: string; result: RefreshedVideoMetadata }>): Promise<void>;
}
import type { RefreshedVideoMetadata } from './youtube-metadata';
