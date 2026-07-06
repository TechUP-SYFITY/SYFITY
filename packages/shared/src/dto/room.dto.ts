import type { PlaylistItem } from './playlist.dto';

export type CreateRoomRequest = {
  /**
   * @minLength 1
   * @maxLength 50
   */
  name: string;
};

export type CreateRoomResponse = {
  success: true;
  data: {
    id: string;
    name: string;
    inviteCode: string;
    status: 'active';
    createdAt: string;
  };
};

export type JoinRoomRequest = {
  inviteCode: string;
};

export type JoinRoomResponse = {
  success: true;
  data: {
    room: {
      id: string;
      name: string;
      status: 'active' | 'inactive' | 'closed';
      inviteCode: string;
      hostId: string;
    };
    playbackState: {
      videoId: string | null;
      playlistItemId: string | null;
      currentTime: number;
      isPlaying: boolean;
      updatedAt: string;
    };
    playlist: PlaylistItem[];
    members: Array<{
      id: string;
      userId: string;
      nickname: string;
      profileImage: string | null;
      role: 'host' | 'member' | 'guest';
      status: 'online' | 'offline' | 'left';
    }>;
    recentChats: Array<{
      id: string;
      userId: string | null;
      nickname: string | null;
      type: 'user' | 'system';
      message: string;
      createdAt: string;
    }>;
  };
};

export type GetRoomResponse = {
  success: true;
  data: {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'closed';
    inviteCode: string;
    hostId: string;
    createdAt: string;
  };
};
