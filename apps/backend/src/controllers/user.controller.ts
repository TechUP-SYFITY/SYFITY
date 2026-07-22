import type { Request as ExRequest } from 'express';
import {
  Body,
  Delete,
  Get,
  Patch,
  Post,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import type {
  CompleteOnboardingRequest,
  CompleteOnboardingResponse,
  ConfirmProfileImageUploadRequest,
  CreateProfileImageUploadUrlRequest,
  CreateProfileImageUploadUrlResponse,
  UpdateNicknameRequest,
  UpdateNicknameResponse,
  UploadProfileImageResponse,
  UserProfileResponse,
} from '@syfity/shared';

import { config } from '../config';
import type { UserService } from '../services/user.service';

type UserControllerService = Pick<
  UserService,
  | 'getMe'
  | 'completeOnboarding'
  | 'updateNickname'
  | 'createProfileImageUploadUrl'
  | 'confirmProfileImageUpload'
  | 'resetProfileImage'
  | 'deleteAccount'
>;

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

  @Patch()
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async completeOnboarding(
    @Request() req: ExRequest,
    @Body() body: CompleteOnboardingRequest,
  ): Promise<CompleteOnboardingResponse> {
    const user = await this.userService.completeOnboarding(req.user!.id, body);
    return { success: true, data: { ...user, onboardedAt: user.onboardedAt.toISOString() } };
  }

  @Patch('nickname')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async updateNickname(
    @Request() req: ExRequest,
    @Body() body: UpdateNicknameRequest,
  ): Promise<UpdateNicknameResponse> {
    const user = await this.userService.updateNickname(req.user!.id, body.nickname);
    return { success: true, data: user };
  }

  @Post('profile-image/upload-url')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async createProfileImageUploadUrl(
    @Request() req: ExRequest,
    @Body() body: CreateProfileImageUploadUrlRequest,
  ): Promise<CreateProfileImageUploadUrlResponse> {
    const data = await this.userService.createProfileImageUploadUrl(req.user!.id, body);
    return { success: true, data };
  }

  @Post('profile-image/confirm')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async confirmProfileImageUpload(
    @Request() req: ExRequest,
    @Body() body: ConfirmProfileImageUploadRequest,
  ): Promise<UploadProfileImageResponse> {
    const user = await this.userService.confirmProfileImageUpload(req.user!.id, body.path);
    return { success: true, data: { profileImage: user.profileImage } };
  }

  @Delete('profile-image')
  @Security('jwt')
  @SuccessResponse(200, 'OK')
  async resetProfileImage(@Request() req: ExRequest): Promise<UploadProfileImageResponse> {
    const user = await this.userService.resetProfileImage(req.user!.id);
    return { success: true, data: { profileImage: user.profileImage } };
  }

  @Delete()
  @Security('jwt')
  @SuccessResponse(204, 'No Content')
  async deleteMe(@Request() req: ExRequest): Promise<void> {
    await this.userService.deleteAccount(req.user!.id);
    const domain = config.nodeEnv === 'production' ? config.cookieDomain : undefined;
    req.res!.clearCookie('access_token', { domain });
    req.res!.clearCookie('refresh_token', { domain, path: '/api/v1/auth/refresh' });
  }
}
