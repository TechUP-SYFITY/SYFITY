import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import type {
  IPersonalPlaylistRepository,
  PersonalPlaylistRecord,
} from '../types/personal-playlist';

type PersonalPlaylistAccessRepository = Pick<IPersonalPlaylistRepository, 'findPlaylistById'>;

export async function assertOwnedPersonalPlaylist(
  repository: PersonalPlaylistAccessRepository,
  playlistId: string,
  userId: string,
): Promise<PersonalPlaylistRecord> {
  const playlist = await repository.findPlaylistById(playlistId);
  if (!playlist) {
    throw new AppError(
      404,
      ERROR_CODES.PERSONAL_PLAYLIST_NOT_FOUND,
      '존재하지 않는 개인 Playlist입니다.',
    );
  }
  if (playlist.ownerId !== userId) {
    throw new AppError(
      403,
      ERROR_CODES.PERSONAL_PLAYLIST_ACCESS_DENIED,
      '본인의 개인 Playlist만 접근할 수 있습니다.',
    );
  }

  return playlist;
}
