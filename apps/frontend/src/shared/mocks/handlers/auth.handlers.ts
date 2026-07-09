import { http, HttpResponse } from 'msw';

import type { LogoutResponse, RefreshResponse, UserProfileResponse } from '@syfity/shared';

import { roomFixture } from '../fixtures/roomFixture';

const API = '*/api/v1';

const currentUser = roomFixture.members[0];

export const authHandlers = [
  http.get(`${API}/me`, () =>
    HttpResponse.json({
      success: true,
      data: {
        email: 'minji@example.com',
        id: currentUser.userId,
        nickname: currentUser.nickname,
        profileImage: currentUser.profileImage,
      },
    } satisfies UserProfileResponse),
  ),
  http.post(`${API}/auth/logout`, () =>
    HttpResponse.json({
      success: true,
      data: { message: 'logged out' },
    } satisfies LogoutResponse),
  ),
  http.post(`${API}/auth/refresh`, () =>
    HttpResponse.json({
      success: true,
      data: { message: 'token refreshed' },
    } satisfies RefreshResponse),
  ),
];
