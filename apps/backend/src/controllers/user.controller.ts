import type { Request as ExRequest } from 'express';
import { Get, Request, Route, Security, SuccessResponse, Tags } from 'tsoa';

import type { UserProfileResponse } from '@syfity/shared';

import type { UserService } from '../services/user.service';

type UserControllerService = Pick<UserService, 'getMe'>;

@Route('me')
@Tags('User')
export class UserController {
  constructor(private readonly userService: UserControllerService) {}

  @Get()
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async getMe(@Request() req: ExRequest): Promise<UserProfileResponse> {
    const userId = req.user!.id;
    const user = await this.userService.getMe(userId);

    return {
      success: true,
      data: { ...user, onboardedAt: user.onboardedAt?.toISOString() ?? null },
    };
  }
}
