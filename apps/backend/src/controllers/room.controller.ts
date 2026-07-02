import type { Request as ExRequest } from 'express';
import { Get, Request, Route, Security, SuccessResponse, Tags } from 'tsoa';

import type { RecentRoomsResponse } from '@syfity/shared';

import type { UserService } from '../services/user.service';

type RoomControllerService = Pick<UserService, 'getRecentRooms'>;

@Route('rooms')
@Tags('Room')
export class RoomController {
  constructor(private readonly userService: RoomControllerService) {}

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
          ...room,
          lastJoinedAt: room.lastJoinedAt.toISOString(),
        })),
      },
    };
  }
}
