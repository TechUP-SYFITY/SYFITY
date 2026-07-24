import { describe, expect, it, vi } from 'vitest';

import { MetadataRefreshService } from './metadata-refresh.service';

describe('MetadataRefreshService', () => {
  it('25일보다 오래된 메타데이터 기준을 두 Playlist 서비스에 함께 전달한다', async () => {
    const playlistService = {
      refreshStaleMetadata: vi.fn().mockResolvedValue({ checkedCount: 2, unavailableCount: 1 }),
    };
    const personalPlaylistService = {
      refreshStaleMetadata: vi.fn().mockResolvedValue({ checkedCount: 3, unavailableCount: 0 }),
    };
    const now = new Date('2026-07-22T12:00:00.000Z');
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const service = new MetadataRefreshService(playlistService, personalPlaylistService);

    try {
      await expect(service.refreshStaleMetadata()).resolves.toEqual({
        playlist: { checkedCount: 2, unavailableCount: 1 },
        personalPlaylist: { checkedCount: 3, unavailableCount: 0 },
      });
      expect(playlistService.refreshStaleMetadata).toHaveBeenCalledWith(
        new Date('2026-06-27T12:00:00.000Z'),
      );
      expect(personalPlaylistService.refreshStaleMetadata).toHaveBeenCalledWith(
        new Date('2026-06-27T12:00:00.000Z'),
      );
    } finally {
      dateNow.mockRestore();
    }
  });
});
