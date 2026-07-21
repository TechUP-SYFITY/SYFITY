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

import {
  ERROR_CODES,
  type CreateRoomRequest,
  type CreateRoomResponse,
  type GetMyRoomsResponse,
  type GetRoomResponse,
  type RecentRoomsResponse,
  type UpdateRoomRequest,
  type UpdateRoomResponse,
} from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { RoomService } from '../services/room.service';
import type { UserService } from '../services/user.service';

type RoomControllerService = Pick<UserService, 'getRecentRooms'>;
type RoomControllerRoomService = Pick<
  RoomService,
  'createRoom' | 'deactivateRoom' | 'getMyRooms' | 'getRoomInfo' | 'updateRoom'
>;
type RoomUpdateCandidate = { name?: unknown; status?: unknown };

function isRenameRoomRequest(body: RoomUpdateCandidate): body is { name: string } {
  return typeof body.name === 'string' && body.status === undefined;
}

function isCloseRoomRequest(body: RoomUpdateCandidate): body is { status: 'closed' } {
  return body.name === undefined && body.status === 'closed';
}

function isRecoverRoomRequest(body: RoomUpdateCandidate): body is { status: 'active' } {
  return body.name === undefined && body.status === 'active';
}

function parseRoomUpdateRequest(
  body: RoomUpdateCandidate,
): { name: string } | { status: 'closed' } | { status: 'active' } | null {
  if (isRenameRoomRequest(body)) {
    return { name: body.name };
  }
  if (isCloseRoomRequest(body)) {
    return { status: 'closed' };
  }
  if (isRecoverRoomRequest(body)) {
    return { status: 'active' };
  }
  return null;
}

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

  @Get('mine')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async getMyRooms(@Request() req: ExRequest): Promise<GetMyRoomsResponse> {
    const rooms = await this.roomService.getMyRooms(req.user!.id);
    return {
      success: true,
      data: {
        rooms: rooms.map((room) => ({
          id: room.id,
          name: room.name,
          status: room.status,
          closedAt: room.closedAt?.toISOString() ?? null,
          updatedAt: room.updatedAt.toISOString(),
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
    const candidate = body as RoomUpdateCandidate;
    const update = parseRoomUpdateRequest(candidate);
    if (!update) {
      throw new AppError(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'name 또는 status: closed 중 하나가 필요합니다.',
      );
    }

    const room = await this.roomService.updateRoom(roomId, userId, update);

    return {
      success: true,
      data: {
        id: room.id,
        name: room.name,
        status: room.status,
        closedAt: room.closedAt?.toISOString() ?? null,
        updatedAt: room.updatedAt.toISOString(),
      },
    };
  }

  @Delete('{roomId}')
  @Security('jwt')
  @SuccessResponse(204, 'No Content')
  async deactivateRoom(@Path() roomId: string, @Request() req: ExRequest): Promise<void> {
    await this.roomService.deactivateRoom(roomId, req.user!.id);
  }
}
