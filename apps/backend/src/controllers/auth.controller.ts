import type { CookieOptions, Request as ExRequest } from 'express';
import { Get, Post, Query, Request, Res, Route, Security, SuccessResponse } from 'tsoa';
import type { TsoaResponse } from 'tsoa';

import { ERROR_CODES, type LogoutResponse, type RefreshResponse } from '@syfity/shared';

import { config } from '../config';
import { AppError } from '../errors/appError';
import type { AuthService } from '../services/auth.service';

type AuthControllerService = Pick<
  AuthService,
  'getAuthorizationUrl' | 'getPostLoginRedirectUrl' | 'handleCallback' | 'logout' | 'refresh'
>;

const AUTH_FAILED_REDIRECT = `${config.clientUrl}/login?error=auth_failed`;

@Route('auth')
export class AuthController {
  constructor(private readonly authService: AuthControllerService) {}

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
      return redirect(302, undefined, { Location: AUTH_FAILED_REDIRECT });
    }

    try {
      const { accessToken, refreshToken } = await this.authService.handleCallback(code);
      const res = req.res!;
      res.cookie('access_token', accessToken, this.getCookieOptions(config.jwt.accessExpiresInMs));
      res.cookie('refresh_token', refreshToken, {
        ...this.getCookieOptions(config.jwt.refreshExpiresInMs),
        path: '/api/v1/auth/refresh',
      });

      return redirect(302, undefined, {
        Location: this.authService.getPostLoginRedirectUrl(state),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[auth:google/callback] 처리 실패', err);
      return redirect(302, undefined, { Location: AUTH_FAILED_REDIRECT });
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

  @Post('refresh')
  @SuccessResponse(200, 'token refreshed')
  async refresh(@Request() req: ExRequest): Promise<RefreshResponse> {
    const refreshToken = req.cookies?.refresh_token;
    if (typeof refreshToken !== 'string') {
      throw new AppError(401, ERROR_CODES.AUTH_REFRESH_EXPIRED, 'Refresh Token이 없습니다.');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refresh(refreshToken);

    const res = req.res!;
    res.cookie('access_token', accessToken, this.getCookieOptions(config.jwt.accessExpiresInMs));
    res.cookie('refresh_token', newRefreshToken, {
      ...this.getCookieOptions(config.jwt.refreshExpiresInMs),
      path: '/api/v1/auth/refresh',
    });

    return { success: true, data: { message: 'token refreshed' } };
  }

  private getCookieOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge,
    };
  }
}
