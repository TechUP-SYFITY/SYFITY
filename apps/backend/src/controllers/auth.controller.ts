import type { CookieOptions, Request as ExRequest } from 'express';
import { Get, Post, Query, Request, Res, Route, Security, SuccessResponse } from 'tsoa';
import type { TsoaResponse } from 'tsoa';

import type { LogoutResponse } from '@syfity/shared';

import { config } from '../config';
import type { AuthService } from '../services/auth.service';

@Route('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  async redirectToGoogle(
    @Query() returnUrl: string | undefined,
    @Res() redirect: TsoaResponse<302, void>,
  ): Promise<void> {
    const url = this.authService.getAuthorizationUrl(returnUrl);
    return redirect(302, undefined, { Location: url });
  }

  @Get('google/callback')
  async googleCallback(
    @Request() req: ExRequest,
    @Res() redirect: TsoaResponse<302, void>,
    @Query() code?: string,
    @Query() state?: string,
  ): Promise<void> {
    if (!code) {
      return redirect(302, undefined, { Location: `${config.clientUrl}?error=auth_failed` });
    }

    try {
      const { accessToken, refreshToken } = await this.authService.handleCallback(code);
      const res = req.res!;
      res.cookie('access_token', accessToken, this.getCookieOptions());
      res.cookie('refresh_token', refreshToken, {
        ...this.getCookieOptions(),
        path: '/api/v1/auth/refresh',
      });

      return redirect(302, undefined, {
        Location: this.authService.getPostLoginRedirectUrl(state),
      });
    } catch {
      return redirect(302, undefined, { Location: `${config.clientUrl}?error=auth_failed` });
    }
  }

  @Post('logout')
  @Security('jwt')
  @SuccessResponse(200, 'logged out')
  async logout(@Request() req: ExRequest): Promise<LogoutResponse> {
    const userId = req.user!.id;
    await this.authService.logout(userId);

    const res = req.res!;
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });

    return { success: true, data: { message: 'logged out' } };
  }

  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    };
  }
}
