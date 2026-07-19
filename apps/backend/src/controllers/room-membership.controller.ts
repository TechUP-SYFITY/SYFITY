import type { Request as ExRequest } from 'express';
import { Body, Post, Request, Res, Route, Security, SuccessResponse, Tags } from 'tsoa';
import type { TsoaResponse } from 'tsoa';

import type { CreateRoomMembershipRequest, CreateRoomMembershipResponse } from '@syfity/shared';

import type { RoomService } from '../services/room.service';

type RoomMembershipControllerService = Pick<RoomService, 'createMembership'>;

@Route('room-memberships')
@Tags('Room')
export class RoomMembershipController {
  constructor(private readonly roomService: RoomMembershipControllerService) {}

  @Post()
  @Security('jwt')
  @SuccessResponse(201, 'Created')
  async createMembership(
    @Request() req: ExRequest,
    @Body() body: CreateRoomMembershipRequest,
    @Res() created: TsoaResponse<201, CreateRoomMembershipResponse>,
    @Res() ok: TsoaResponse<200, CreateRoomMembershipResponse>,
  ): Promise<CreateRoomMembershipResponse> {
    const result = await this.roomService.createMembership(req.user!.id, body.inviteCode);
    const response: CreateRoomMembershipResponse = {
      success: true,
      data: {
        room: {
          id: result.room.id,
          name: result.room.name,
          status: result.room.status,
          inviteCode: result.room.inviteCode,
          hostId: result.room.hostId,
        },
      },
    };

    return result.isNewMembership ? created(201, response) : ok(200, response);
  }
}
