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
  AddPersonalPlaylistItemRequest,
  AddPersonalPlaylistItemResponse,
  CreatePersonalPlaylistRequest,
  CreatePersonalPlaylistResponse,
  GetPersonalPlaylistResponse,
  GetPersonalPlaylistsResponse,
  PersonalPlaylist,
  PersonalPlaylistItem,
  ReorderPersonalPlaylistItemsRequest,
  ReorderPersonalPlaylistItemsResponse,
  UpdatePersonalPlaylistRequest,
  UpdatePersonalPlaylistResponse,
} from '@syfity/shared';

import type { PersonalPlaylistService } from '../services/personal-playlist.service';
import type {
  PersonalPlaylistItemRecord,
  PersonalPlaylistRecord,
} from '../types/personal-playlist';

type PersonalPlaylistControllerService = Pick<
  PersonalPlaylistService,
  | 'getPlaylists'
  | 'createPlaylist'
  | 'getPlaylistDetail'
  | 'renamePlaylist'
  | 'deletePlaylist'
  | 'addItem'
  | 'deleteItem'
  | 'reorderItems'
>;

@Route('personal-playlists')
@Tags('PersonalPlaylist')
@Security('jwt')
export class PersonalPlaylistController {
  constructor(private readonly service: PersonalPlaylistControllerService) {}

  @Get()
  async getPlaylists(@Request() req: ExRequest): Promise<GetPersonalPlaylistsResponse> {
    const playlists = await this.service.getPlaylists(req.user!.id);
    return { success: true, data: { playlists: playlists.map(toPersonalPlaylist) } };
  }

  @Post()
  @SuccessResponse(201, 'Created')
  async createPlaylist(
    @Request() req: ExRequest,
    @Body() body: CreatePersonalPlaylistRequest,
  ): Promise<CreatePersonalPlaylistResponse> {
    const playlist = await this.service.createPlaylist(req.user!.id, body.name);
    return {
      success: true,
      data: {
        id: playlist.id,
        name: playlist.name,
        createdAt: playlist.createdAt.toISOString(),
      },
    };
  }

  @Get('{playlistId}')
  async getPlaylistDetail(
    @Path() playlistId: string,
    @Request() req: ExRequest,
  ): Promise<GetPersonalPlaylistResponse> {
    const { playlist, items } = await this.service.getPlaylistDetail(playlistId, req.user!.id);
    return {
      success: true,
      data: { playlist: toPersonalPlaylist(playlist), items: items.map(toPersonalPlaylistItem) },
    };
  }

  @Patch('{playlistId}')
  async renamePlaylist(
    @Path() playlistId: string,
    @Request() req: ExRequest,
    @Body() body: UpdatePersonalPlaylistRequest,
  ): Promise<UpdatePersonalPlaylistResponse> {
    const playlist = await this.service.renamePlaylist(playlistId, req.user!.id, body.name);
    return {
      success: true,
      data: { id: playlist.id, name: playlist.name, updatedAt: playlist.updatedAt.toISOString() },
    };
  }

  @Delete('{playlistId}')
  @SuccessResponse(204, 'No Content')
  async deletePlaylist(@Path() playlistId: string, @Request() req: ExRequest): Promise<void> {
    await this.service.deletePlaylist(playlistId, req.user!.id);
  }

  @Post('{playlistId}/items')
  @SuccessResponse(201, 'Created')
  async addItem(
    @Path() playlistId: string,
    @Request() req: ExRequest,
    @Body() body: AddPersonalPlaylistItemRequest,
  ): Promise<AddPersonalPlaylistItemResponse> {
    const item = await this.service.addItem(playlistId, req.user!.id, body);
    return { success: true, data: toPersonalPlaylistItem(item) };
  }

  @Delete('{playlistId}/items/{itemId}')
  @SuccessResponse(204, 'No Content')
  async deleteItem(
    @Path() playlistId: string,
    @Path() itemId: string,
    @Request() req: ExRequest,
  ): Promise<void> {
    await this.service.deleteItem(playlistId, req.user!.id, itemId);
  }

  @Patch('{playlistId}/items')
  async reorderItems(
    @Path() playlistId: string,
    @Request() req: ExRequest,
    @Body() body: ReorderPersonalPlaylistItemsRequest,
  ): Promise<ReorderPersonalPlaylistItemsResponse> {
    const items = await this.service.reorderItems(playlistId, req.user!.id, body.items);
    return { success: true, data: { items: items.map(toPersonalPlaylistItem) } };
  }
}

function toPersonalPlaylist(playlist: PersonalPlaylistRecord): PersonalPlaylist {
  return {
    id: playlist.id,
    name: playlist.name,
    createdAt: playlist.createdAt.toISOString(),
    updatedAt: playlist.updatedAt.toISOString(),
  };
}

function toPersonalPlaylistItem(item: PersonalPlaylistItemRecord): PersonalPlaylistItem {
  return {
    id: item.id,
    videoId: item.videoId,
    title: item.title,
    channelTitle: item.channelTitle,
    thumbnailUrl: item.thumbnailUrl,
    duration: item.duration,
    position: item.position,
    status: item.status,
  };
}
