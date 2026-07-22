import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { PlaylistImportController } from './playlist-import.controller';

function request(): ExRequest {
  return { user: { id: 'user-1', email: 'user@example.com' } } as ExRequest;
}

describe('PlaylistImportController', () => {
  it('가져오기 결과를 계약 응답으로 반환한다', async () => {
    const service = {
      importFromPersonalPlaylist: vi.fn().mockResolvedValue({
        addedCount: 2,
        duplicateCount: 1,
        unavailableCount: 0,
      }),
    };
    const controller = new PlaylistImportController(service);

    await expect(
      controller.importPlaylist('room-1', request(), { personalPlaylistId: 'playlist-1' }),
    ).resolves.toEqual({
      success: true,
      data: { addedCount: 2, duplicateCount: 1, unavailableCount: 0 },
    });
    expect(service.importFromPersonalPlaylist).toHaveBeenCalledWith(
      'room-1',
      'user-1',
      'playlist-1',
    );
  });

  it('Service 오류를 전파한다', async () => {
    const error = new Error('failed');
    const service = { importFromPersonalPlaylist: vi.fn().mockRejectedValue(error) };
    const controller = new PlaylistImportController(service);

    await expect(
      controller.importPlaylist('room-1', request(), { personalPlaylistId: 'playlist-1' }),
    ).rejects.toThrow(error);
  });
});
