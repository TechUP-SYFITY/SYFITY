import type { Request as ExRequest } from 'express';
import {
  Body,
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
  CloseRoomResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  GetRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RecentRoomsResponse,
  UpdateRoomRequest,
  UpdateRoomResponse,
} from '@syfity/shared';

import type { RoomService } from '../services/room.service';
import type { UserService } from '../services/user.service';

type RoomControllerService = Pick<UserService, 'getRecentRooms'>;
type RoomControllerRoomService = Pick<
  RoomService,
  'createRoom' | 'joinRoom' | 'getRoomInfo' | 'updateRoom' | 'closeRoomAndBroadcast'
>;

@Route('rooms')
@Tags('Room')
export class RoomController {
  constructor(
    private readonly userService: RoomControllerService,
    private readonly roomService: RoomControllerRoomService,
  ) {}

  @Post()
  @Security('jwt')
  @SuccessResponse(201, 'Created')
  async createRoom(
    @Request() req: ExRequest,
    @Body() body: CreateRoomRequest,
  ): Promise<CreateRoomResponse> {
    const userId = req.user!.id;
    const room = await this.roomService.createRoom(userId, body.name);

    return {
      success: true,
      data: {
        id: room.id,
        name: room.name,
        inviteCode: room.inviteCode,
        status: 'active',
        createdAt: room.createdAt.toISOString(),
      },
    };
  }

  @Get('recent')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async getRecentRooms(@Request() req: ExRequest): Promise<RecentRoomsResponse> {
    const userId = req.user!.id;
    const rooms = await this.userService.getRecentRooms(userId);

    return {
      success: true,
      data: {
        rooms: rooms.map((room) => ({
          id: room.id,
          name: room.name,
          inviteCode: room.inviteCode,
          lastJoinedAt: room.lastJoinedAt.toISOString(),
        })),
      },
    };
  }

  @Post('join')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async joinRoom(
    @Request() req: ExRequest,
    @Body() body: JoinRoomRequest,
  ): Promise<JoinRoomResponse> {
    const userId = req.user!.id;
    const result = await this.roomService.joinRoom(userId, body.inviteCode);

    return {
      success: true,
      data: {
        room: {
          id: result.room.id,
          name: result.room.name,
          status: result.room.status,
          inviteCode: result.room.inviteCode,
          hostId: result.room.hostId,
        },
        playbackState: result.playbackState,
        playlist: result.playlist.map((item) => ({
          id: item.id,
          videoId: item.videoId,
          title: item.title,
          channelTitle: item.channelTitle,
          thumbnailUrl: item.thumbnailUrl,
          duration: item.duration,
          position: item.position,
          addedBy: item.addedBy,
          status: item.status,
        })),
        members: result.members,
        recentChats: result.recentChats.map((chat) => ({
          id: chat.id,
          userId: chat.userId,
          nickname: chat.nickname,
          profileImage: chat.profileImage,
          type: chat.type,
          message: chat.message,
          createdAt: chat.createdAt.toISOString(),
        })),
      },
    };
  }

  @Get('{roomId}')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async getRoom(@Path() roomId: string, @Request() req: ExRequest): Promise<GetRoomResponse> {
    const userId = req.user!.id;
    const room = await this.roomService.getRoomInfo(roomId, userId);

    return {
      success: true,
      data: {
        id: room.id,
        name: room.name,
        status: room.status,
        inviteCode: room.inviteCode,
        hostId: room.hostId,
        createdAt: room.createdAt.toISOString(),
      },
    };
  }

  @Patch('{roomId}')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async updateRoom(
    @Path() roomId: string,
    @Request() req: ExRequest,
    @Body() body: UpdateRoomRequest,
  ): Promise<UpdateRoomResponse> {
    const userId = req.user!.id;
    const room = await this.roomService.updateRoom(roomId, userId, body.name);

    return {
      success: true,
      data: {
        id: room.id,
        name: room.name,
        updatedAt: room.updatedAt.toISOString(),
      },
    };
  }

  @Post('{roomId}/close')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async closeRoom(@Path() roomId: string, @Request() req: ExRequest): Promise<CloseRoomResponse> {
    const userId = req.user!.id;
    await this.roomService.closeRoomAndBroadcast(roomId, userId);

    return { success: true, data: { message: 'room closed' } };
  }
}
