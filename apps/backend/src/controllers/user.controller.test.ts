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
  } as ExRequest;
}

function makeUserService() {
  return {
    getMe: vi.fn().mockResolvedValue(userProfile),
  };
}

describe('UserController', () => {
  it('GET /me 응답을 반환한다', async () => {
    const userService = makeUserService();
    const controller = new UserController(userService);

    await expect(controller.getMe(makeRequest())).resolves.toEqual({
      success: true,
      data: userProfile,
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
});
