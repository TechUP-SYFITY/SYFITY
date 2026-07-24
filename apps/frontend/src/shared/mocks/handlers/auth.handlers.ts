import { http, HttpResponse } from 'msw';

import type {
  CompleteOnboardingResponse,
  CreateProfileImageUploadUrlResponse,
  LogoutResponse,
  RefreshResponse,
  UpdateNicknameResponse,
  UploadProfileImageResponse,
  UserProfileResponse,
} from '@syfity/shared';

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
        onboardedAt: new Date().toISOString(),
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
  http.patch(`${API}/me`, async ({ request }) => {
    const body = (await request.json()) as { nickname: string };
    return HttpResponse.json({
      success: true,
      data: {
        id: currentUser.userId,
        email: 'minji@example.com',
        nickname: body.nickname,
        profileImage: currentUser.profileImage,
        onboardedAt: new Date().toISOString(),
      },
    } satisfies CompleteOnboardingResponse);
  }),
  http.patch(`${API}/me/nickname`, async ({ request }) => {
    const body = (await request.json()) as { nickname: string };
    return HttpResponse.json({
      success: true,
      data: {
        id: currentUser.userId,
        email: 'minji@example.com',
        nickname: body.nickname,
        profileImage: currentUser.profileImage,
      },
    } satisfies UpdateNicknameResponse);
  }),
  http.delete(`${API}/me`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}/me/profile-image/upload-url`, () =>
    HttpResponse.json({
      success: true,
      data: {
        path: `${currentUser.userId}/mock.png`,
        token: 'mock-token',
        bucket: 'profile-images',
      },
    } satisfies CreateProfileImageUploadUrlResponse),
  ),
  http.post(`${API}/me/profile-image/confirm`, () =>
    HttpResponse.json({
      success: true,
      data: { profileImage: 'blob:mock-profile-image' },
    } satisfies UploadProfileImageResponse),
  ),
  http.delete(`${API}/me/profile-image`, () =>
    HttpResponse.json({
      success: true,
      data: { profileImage: null },
    } satisfies UploadProfileImageResponse),
  ),
];
