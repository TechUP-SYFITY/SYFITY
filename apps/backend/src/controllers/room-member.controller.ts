import type { Request as ExRequest } from 'express';
import {
  Body,
  Get,
  Patch,
  Path,
  Query,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import {
  ERROR_CODES,
  type GetActiveRoomMembersResponse,
  type GetKickedRoomMembersResponse,
  type UpdateRoomMemberRequest,
  type UpdateRoomMemberResponse,
} from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { RoomService } from '../services/room.service';

type RoomMemberControllerService = Pick<
  RoomService,
  'getActiveMembers' | 'getKickedMembers' | 'kickMember' | 'unkickMember'
>;
type MemberUpdateCandidate = { status?: unknown };

function isKickRequest(body: MemberUpdateCandidate): body is { status: 'kicked' } {
  return body.status === 'kicked';
}

function isUnkickRequest(body: MemberUpdateCandidate): body is { status: 'left' } {
  return body.status === 'left';
}

@Route('rooms/{roomId}/members')
@Tags('Room')
export class RoomMemberController {
  constructor(private readonly roomService: RoomMemberControllerService) {}

  @Get()
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async getMembers(
    @Path() roomId: string,
    @Request() req: ExRequest,
    @Query() status?: 'kicked',
  ): Promise<GetActiveRoomMembersResponse | GetKickedRoomMembersResponse> {
    const userId = req.user!.id;
    if (status === 'kicked') {
      const members = await this.roomService.getKickedMembers(roomId, userId);
      return {
        success: true,
        data: {
          members: members.map((member) => ({
            id: member.id,
            userId: member.userId,
            nickname: member.nickname,
            profileImage: member.profileImage,
            kickedAt: member.kickedAt.toISOString(),
          })),
        },
      };
    }

    const members = await this.roomService.getActiveMembers(roomId, userId);
    return {
      success: true,
      data: {
        members: members.map((member) => ({
          id: member.id,
          userId: member.userId,
          nickname: member.nickname,
          profileImage: member.profileImage,
          role: member.role,
          status: member.status as 'online' | 'offline',
        })),
      },
    };
  }

  @Patch('{memberId}')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async updateMember(
    @Path() roomId: string,
    @Path() memberId: string,
    @Request() req: ExRequest,
    @Body() body: UpdateRoomMemberRequest,
  ): Promise<UpdateRoomMemberResponse> {
    const candidate = body as MemberUpdateCandidate;
    if (isKickRequest(candidate)) {
      const data = await this.roomService.kickMember(roomId, req.user!.id, memberId);
      return { success: true, data };
    }
    if (isUnkickRequest(candidate)) {
      const data = await this.roomService.unkickMember(roomId, req.user!.id, memberId);
      return { success: true, data };
    }

    throw new AppError(
      400,
      ERROR_CODES.VALIDATION_ERROR,
      "status: 'kicked' 또는 'left'가 필요합니다.",
    );
  }
}
