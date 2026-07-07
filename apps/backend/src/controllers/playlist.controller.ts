import type { Request as ExRequest } from 'express';
import {
  Body,
  Delete,
  Get,
  Patch,
  Path,
  Post,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import type {
  AddPlaylistItemRequest,
  AddPlaylistItemResponse,
  DeletePlaylistItemResponse,
  GetPlaylistResponse,
  PlaylistItem,
  ReorderPlaylistRequest,
  ReorderPlaylistResponse,
} from '@syfity/shared';

import type { PlaylistService } from '../services/playlist.service';
import type { PlaylistItemRecord } from '../types/playlist';

type PlaylistControllerService = Pick<
  PlaylistService,
  'getPlaylist' | 'addItem' | 'reorderPlaylist' | 'deleteItem'
>;

@Route('rooms/{roomId}/playlist')
@Tags('Playlist')
@Security('jwt')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistControllerService) {}

  @Get()
  @SuccessResponse(200, 'OK')
  async getPlaylist(
    @Path() roomId: string,
    @Request() req: ExRequest,
  ): Promise<GetPlaylistResponse> {
    const userId = req.user!.id;
    const playlist = await this.playlistService.getPlaylist(roomId, userId);

    return {
      success: true,
      data: {
        playlist: playlist.map((item) => this.toPlaylistItem(item)),
      },
    };
  }

  @Post()
  @SuccessResponse(201, 'Created')
  async addItem(
    @Path() roomId: string,
    @Request() req: ExRequest,
    @Body() body: AddPlaylistItemRequest,
  ): Promise<AddPlaylistItemResponse> {
    const userId = req.user!.id;
    const item = await this.playlistService.addItem(roomId, userId, body);

    return {
      success: true,
      data: this.toPlaylistItem(item),
    };
  }

  @Patch('reorder')
  @SuccessResponse(200, 'OK')
  async reorderPlaylist(
    @Path() roomId: string,
    @Request() req: ExRequest,
    @Body() body: ReorderPlaylistRequest,
  ): Promise<ReorderPlaylistResponse> {
    const userId = req.user!.id;
    await this.playlistService.reorderPlaylist(roomId, userId, body.items);

    return { success: true, data: { message: 'playlist reordered' } };
  }

  @Delete('{itemId}')
  @SuccessResponse(200, 'OK')
  async deleteItem(
    @Path() roomId: string,
    @Path() itemId: string,
    @Request() req: ExRequest,
  ): Promise<DeletePlaylistItemResponse> {
    const userId = req.user!.id;
    await this.playlistService.deleteItem(roomId, userId, itemId);

    return { success: true, data: { message: 'playlist item deleted' } };
  }

  private toPlaylistItem(item: PlaylistItemRecord): PlaylistItem {
    return {
      id: item.id,
      videoId: item.videoId,
      title: item.title,
      channelTitle: item.channelTitle,
      thumbnailUrl: item.thumbnailUrl,
      duration: item.duration,
      position: item.position,
      addedBy: item.addedBy,
      status: item.status,
    };
  }
}
