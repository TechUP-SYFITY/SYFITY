// Playback 공통 유틸이 현재 곡 fallback 규칙을 지키는지 검증한다.
import { describe, expect, it } from 'vitest';

import type { PlaybackState, PlaylistItem } from '@/shared/types/domain';

import { getAdjacentPlayablePlaylistItems, getCurrentPlaylistItem } from './playback';

const playlist = [
  createPlaylistItem('playlist-item-1', 'First Track'),
  createPlaylistItem('playlist-item-2', 'Second Track'),
];

describe('getCurrentPlaylistItem', () => {
  it('playbackState의 playlistItemId와 일치하는 곡을 반환한다', () => {
    expect(
      getCurrentPlaylistItem(playlist, createPlaybackState({ playlistItemId: 'playlist-item-2' })),
    ).toBe(playlist[1]);
  });

  it('일치하는 곡이 없으면 첫 번째 곡을 반환한다', () => {
    expect(
      getCurrentPlaylistItem(
        playlist,
        createPlaybackState({ playlistItemId: 'missing-playlist-item' }),
      ),
    ).toBe(playlist[0]);
  });

  it('playbackState가 없으면 첫 번째 곡을 반환한다', () => {
    expect(getCurrentPlaylistItem(playlist, null)).toBe(playlist[0]);
  });

  it('playlist가 비어 있으면 undefined를 반환한다', () => {
    expect(getCurrentPlaylistItem([], createPlaybackState())).toBeUndefined();
  });

  it('현재 곡이 없으면 첫 번째 available 곡을 반환한다', () => {
    const playlistWithUnavailable = [
      { ...playlist[0], status: 'unavailable' as const },
      playlist[1],
    ];

    expect(getCurrentPlaylistItem(playlistWithUnavailable, null)).toBe(playlist[1]);
  });
});

describe('getAdjacentPlayablePlaylistItems', () => {
  it('현재 곡 앞뒤의 unavailable 곡을 건너뛴다', () => {
    const currentItem = createPlaylistItem('playlist-item-current', 'Current Track');
    const previousItem = createPlaylistItem('playlist-item-previous', 'Previous Track');
    const nextItem = createPlaylistItem('playlist-item-next', 'Next Track');
    const playlistWithUnavailable = [
      previousItem,
      {
        ...createPlaylistItem('playlist-item-unavailable-1', 'Unavailable'),
        status: 'unavailable' as const,
      },
      currentItem,
      {
        ...createPlaylistItem('playlist-item-unavailable-2', 'Unavailable'),
        status: 'unavailable' as const,
      },
      nextItem,
    ];

    expect(getAdjacentPlayablePlaylistItems(playlistWithUnavailable, currentItem)).toEqual({
      nextItem,
      previousItem,
    });
  });
});

function createPlaylistItem(id: string, title: string): PlaylistItem {
  return {
    addedBy: 'user-1',
    channelTitle: 'Channel',
    duration: 180,
    id,
    position: 1,
    status: 'available',
    thumbnailUrl: '',
    title,
    videoId: `video-${id}`,
  };
}

function createPlaybackState(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    currentTime: 0,
    isPlaying: false,
    playlistItemId: 'playlist-item-1',
    videoId: 'video-playlist-item-1',
    ...overrides,
  };
}
