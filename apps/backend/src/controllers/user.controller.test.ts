import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { UserController } from './user.controller';
import type { UserProfileRecord } from '../types/user';

const userProfile: UserProfileRecord = {
  id: 'user-id',
  email: 'alice@example.com',
  nickname: 'Alice',
  profileImage: null,
};

function makeRequest(): ExRequest {
  return {
    user: { id: 'user-id', email: 'alice@example.com' },
    res: { clearCookie: vi.fn() },
  } as unknown as ExRequest;
}

function makeUserService() {
  return {
    getMe: vi.fn().mockResolvedValue(userProfile),
    completeOnboarding: vi.fn(),
    updateNickname: vi.fn(),
    createProfileImageUploadUrl: vi.fn(),
    confirmProfileImageUpload: vi.fn(),
    resetProfileImage: vi.fn(),
    deleteAccount: vi.fn(),
  };
}

describe('UserController', () => {
  it('GET /me 응답을 반환한다', async () => {
    const userService = makeUserService();
    const controller = new UserController(userService);

    await expect(controller.getMe(makeRequest())).resolves.toEqual({
      success: true,
      data: { ...userProfile, onboardedAt: null },
    });
    expect(userService.getMe).toHaveBeenCalledWith('user-id');
  });

  it('service 에러를 그대로 전파한다', async () => {
    const userService = makeUserService();
    const error = new Error('user not found');
    userService.getMe.mockRejectedValue(error);
    const controller = new UserController(userService);

    await expect(controller.getMe(makeRequest())).rejects.toBe(error);
  });

  it('온보딩, 닉네임, 이미지 요청을 인증 사용자 id로 Service에 위임한다', async () => {
    const userService = makeUserService();
    userService.completeOnboarding.mockResolvedValue({
      ...userProfile,
      nickname: 'New name',
      onboardedAt: new Date('2026-07-22T00:00:00.000Z'),
    });
    userService.updateNickname.mockResolvedValue({ ...userProfile, nickname: 'New name' });
    userService.createProfileImageUploadUrl.mockResolvedValue({
      path: 'user-id/image.png',
      token: 'token',
      bucket: 'profile-images',
    });
    userService.confirmProfileImageUpload.mockResolvedValue({
      ...userProfile,
      profileImage: 'https://cdn.example/image.png',
    });
    userService.resetProfileImage.mockResolvedValue(userProfile);
    const controller = new UserController(userService);
    const request = makeRequest();

    await expect(
      controller.completeOnboarding(request, { nickname: 'New name', ageAndTermsAgreed: true }),
    ).resolves.toEqual({
      success: true,
      data: expect.objectContaining({ onboardedAt: '2026-07-22T00:00:00.000Z' }),
    });
    await controller.updateNickname(request, { nickname: 'New name' });
    await controller.createProfileImageUploadUrl(request, { mimeType: 'image/png' });
    await controller.confirmProfileImageUpload(request, { path: 'user-id/image.png' });
    await controller.resetProfileImage(request);

    expect(userService.completeOnboarding).toHaveBeenCalledWith('user-id', {
      nickname: 'New name',
      ageAndTermsAgreed: true,
    });
    expect(userService.updateNickname).toHaveBeenCalledWith('user-id', 'New name');
    expect(userService.createProfileImageUploadUrl).toHaveBeenCalledWith('user-id', {
      mimeType: 'image/png',
    });
    expect(userService.confirmProfileImageUpload).toHaveBeenCalledWith(
      'user-id',
      'user-id/image.png',
    );
    expect(userService.resetProfileImage).toHaveBeenCalledWith('user-id');
  });

  it('회원 탈퇴 후 access와 refresh 쿠키를 제거한다', async () => {
    const userService = makeUserService();
    const controller = new UserController(userService);
    const request = makeRequest();

    await controller.deleteMe(request);

    expect(userService.deleteAccount).toHaveBeenCalledWith('user-id');
    expect(request.res!.clearCookie).toHaveBeenCalledWith('access_token', { domain: undefined });
    expect(request.res!.clearCookie).toHaveBeenCalledWith('refresh_token', {
      domain: undefined,
      path: '/api/v1/auth/refresh',
    });
  });
});
