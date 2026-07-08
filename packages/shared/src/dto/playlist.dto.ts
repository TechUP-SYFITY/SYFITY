export type PlaylistItem = {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
  position: number;
  addedBy: string;
  status: 'available' | 'unavailable';
};

export type GetPlaylistResponse = {
  success: true;
  data: {
    playlist: PlaylistItem[];
  };
};

export type AddPlaylistItemRequest = {
  videoId?: string;
  youtubeUrl?: string;
};

export type AddPlaylistItemResponse = {
  success: true;
  data: PlaylistItem;
};

export type ReorderPlaylistItem = {
  id: string;
  position: number;
};

export type ReorderPlaylistRequest = {
  items: ReorderPlaylistItem[];
};

export type ReorderPlaylistResponse = {
  success: true;
  data: { message: string };
};

export type DeletePlaylistItemResponse = {
  success: true;
  data: { message: string };
};
