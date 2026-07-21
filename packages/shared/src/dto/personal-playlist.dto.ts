export type PersonalPlaylist = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PersonalPlaylistItem = {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
  position: number;
  status: 'available' | 'unavailable';
};

export type CreatePersonalPlaylistRequest = { name: string };
export type UpdatePersonalPlaylistRequest = { name: string };
export type AddPersonalPlaylistItemRequest = { videoId?: string; youtubeUrl?: string };
export type ReorderPersonalPlaylistItem = { id: string; position: number };
export type ReorderPersonalPlaylistItemsRequest = { items: ReorderPersonalPlaylistItem[] };

export type GetPersonalPlaylistsResponse = {
  success: true;
  data: { playlists: PersonalPlaylist[] };
};

export type CreatePersonalPlaylistResponse = {
  success: true;
  data: Pick<PersonalPlaylist, 'id' | 'name' | 'createdAt'>;
};

export type GetPersonalPlaylistResponse = {
  success: true;
  data: { playlist: PersonalPlaylist; items: PersonalPlaylistItem[] };
};

export type UpdatePersonalPlaylistResponse = {
  success: true;
  data: Pick<PersonalPlaylist, 'id' | 'name' | 'updatedAt'>;
};

export type AddPersonalPlaylistItemResponse = {
  success: true;
  data: PersonalPlaylistItem;
};

export type ReorderPersonalPlaylistItemsResponse = {
  success: true;
  data: { items: PersonalPlaylistItem[] };
};
