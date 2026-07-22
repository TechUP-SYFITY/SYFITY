import type { PersonalPlaylistService } from './personal-playlist.service';
import type { PlaylistService } from './playlist.service';
import { logger } from '../lib/logger';

const METADATA_REFRESH_CUTOFF_MS = 25 * 24 * 60 * 60 * 1000;

export class MetadataRefreshService {
  constructor(
    private readonly playlistService: Pick<PlaylistService, 'refreshStaleMetadata'>,
    private readonly personalPlaylistService: Pick<PersonalPlaylistService, 'refreshStaleMetadata'>,
  ) {}

  async refreshStaleMetadata(): Promise<{
    playlist: { checkedCount: number; unavailableCount: number };
    personalPlaylist: { checkedCount: number; unavailableCount: number };
  }> {
    const cutoff = new Date(Date.now() - METADATA_REFRESH_CUTOFF_MS);
    const [playlist, personalPlaylist] = await Promise.all([
      this.playlistService.refreshStaleMetadata(cutoff),
      this.personalPlaylistService.refreshStaleMetadata(cutoff),
    ]);
    logger.info({ playlist, personalPlaylist }, '[MetadataRefreshService] 실행 완료');
    return { playlist, personalPlaylist };
  }
}
