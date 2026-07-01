import type { OAuth2Client } from 'google-auth-library';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { config } from '../config';
import { AppError } from '../errors/appError';
import type { IAuthRepository, UserRecord } from '../types/auth';

export type AuthTokens = {
  user: UserRecord;
  accessToken: string;
  refreshToken: string;
};

type GoogleProfile = {
  email?: string;
  name?: string;
  picture?: string;
};

export class AuthService {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly oauthClient: OAuth2Client,
  ) {}

  getAuthorizationUrl(returnUrl?: string): string {
    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state: returnUrl ?? '',
    });
  }

  async handleCallback(code: string): Promise<AuthTokens> {
    const idToken = await this.exchangeCodeForIdToken(code);
    const payload = await this.verifyIdToken(idToken);

    if (!payload.email) {
      throw new AppError(
        400,
        'AUTH_GOOGLE_EMAIL_MISSING',
        'Google 계정 이메일을 확인할 수 없습니다.',
      );
    }

    const user = await this.authRepo.upsertUser({
      email: payload.email,
      nickname: payload.name ?? payload.email,
      profileImage: payload.picture ?? null,
    });
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);

    await this.authRepo.saveRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  async logout(userId: string): Promise<void> {
    await this.authRepo.clearRefreshToken(userId);
  }

  private async exchangeCodeForIdToken(code: string): Promise<string> {
    try {
      const { tokens } = await this.oauthClient.getToken(code);
      if (!tokens.id_token) {
        throw new AppError(400, 'AUTH_GOOGLE_TOKEN_MISSING', 'Google ID 토큰이 응답에 없습니다.');
      }

      return tokens.id_token;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        400,
        'AUTH_GOOGLE_CALLBACK_FAILED',
        'Google OAuth 콜백 처리에 실패했습니다.',
      );
    }
  }

  private async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });
      const payload = ticket.getPayload();
      return {
        email: payload?.email,
        name: payload?.name,
        picture: payload?.picture,
      };
    } catch {
      throw new AppError(401, 'AUTH_GOOGLE_TOKEN_INVALID', 'Google ID 토큰이 유효하지 않습니다.');
    }
  }

  private signAccessToken(user: UserRecord): string {
    return jwt.sign({ id: user.id, email: user.email }, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn as SignOptions['expiresIn'],
    });
  }

  private signRefreshToken(user: UserRecord): string {
    return jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'],
    });
  }
}
