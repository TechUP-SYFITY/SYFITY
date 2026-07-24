import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { assertOwnedPersonalPlaylist } from './personalPlaylistAccess';
import type { PersonalPlaylistRecord } from '../types/personal-playlist';

const playlist: PersonalPlaylistRecord = {
  id: 'playlist-1',
  ownerId: 'user-1',
  name: 'My songs',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('assertOwnedPersonalPlaylist', () => {
  it('Playlist가 없으면 PERSONAL_PLAYLIST_NOT_FOUND를 던진다', async () => {
    const repo = { findPlaylistById: vi.fn().mockResolvedValue(null) };

    await expect(assertOwnedPersonalPlaylist(repo, 'playlist-1', 'user-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.PERSONAL_PLAYLIST_NOT_FOUND,
    });
  });

  it('다른 사용자의 Playlist면 PERSONAL_PLAYLIST_ACCESS_DENIED를 던진다', async () => {
    const repo = { findPlaylistById: vi.fn().mockResolvedValue(playlist) };

    await expect(assertOwnedPersonalPlaylist(repo, 'playlist-1', 'user-2')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.PERSONAL_PLAYLIST_ACCESS_DENIED,
    });
  });

  it('소유자의 Playlist를 반환한다', async () => {
    const repo = { findPlaylistById: vi.fn().mockResolvedValue(playlist) };

    await expect(assertOwnedPersonalPlaylist(repo, 'playlist-1', 'user-1')).resolves.toEqual(
      playlist,
    );
  });
});
