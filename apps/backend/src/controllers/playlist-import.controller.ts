import type { Request as ExRequest } from 'express';
import { Body, Path, Post, Request, Route, Security, SuccessResponse, Tags } from 'tsoa';

import type { ImportPersonalPlaylistRequest, ImportPersonalPlaylistResponse } from '@syfity/shared';

import type { PlaylistService } from '../services/playlist.service';

type PlaylistImportControllerService = Pick<PlaylistService, 'importFromPersonalPlaylist'>;

@Route('rooms/{roomId}/playlist-imports')
@Tags('Playlist')
@Security('jwt')
export class PlaylistImportController {
  constructor(private readonly playlistService: PlaylistImportControllerService) {}

  @Post()
  @SuccessResponse(200, 'OK')
  async importPlaylist(
    @Path() roomId: string,
    @Request() req: ExRequest,
    @Body() body: ImportPersonalPlaylistRequest,
  ): Promise<ImportPersonalPlaylistResponse> {
    const result = await this.playlistService.importFromPersonalPlaylist(
      roomId,
      req.user!.id,
      body.personalPlaylistId,
    );
    return { success: true, data: result };
  }
}
