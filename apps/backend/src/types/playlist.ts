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
};

export type AddPlaylistItemData = {
  roomId: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
  position: number;
  addedBy: string;
};

export interface IPlaylistRepository {
  getPlaylist(roomId: string): Promise<PlaylistItemRecord[]>;
  getMaxPosition(roomId: string): Promise<number | null>;
  addItem(data: AddPlaylistItemData): Promise<PlaylistItemRecord>;
}
