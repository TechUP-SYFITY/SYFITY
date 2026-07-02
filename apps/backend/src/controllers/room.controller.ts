import type { Request as ExRequest } from 'express';
import { Body, Get, Post, Request, Route, Security, SuccessResponse, Tags } from 'tsoa';

import type { CreateRoomRequest, CreateRoomResponse, RecentRoomsResponse } from '@syfity/shared';

import type { RoomService } from '../services/room.service';
import type { UserService } from '../services/user.service';

type RoomControllerService = Pick<UserService, 'getRecentRooms'>;
type RoomControllerRoomService = Pick<RoomService, 'createRoom'>;

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
}
