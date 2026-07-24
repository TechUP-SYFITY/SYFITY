import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { UserService } from './user.service';
import { logger } from '../lib/logger';
import type { IAccountDeletionRepository } from '../types/account-deletion';
import type { IProfileImageRepository } from '../types/profile-image';
import type { IUserRepository, RecentRoomRecord, UserProfileRecord } from '../types/user';

const userProfile: UserProfileRecord = {
  id: 'user-id',
  email: 'alice@example.com',
  nickname: 'Alice',
  profileImage: 'https://example.com/alice.png',
};

const recentRooms: RecentRoomRecord[] = [
  {
    id: 'room-1',
    name: 'Morning Jazz',
    inviteCode: 'ABCD1234',
    lastJoinedAt: new Date('2026-07-01T12:00:00.000Z'),
  },
];

function makeRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    findUserById: vi.fn().mockResolvedValue(userProfile),
    findRecentRooms: vi.fn().mockResolvedValue(recentRooms),
    completeOnboarding: vi.fn().mockResolvedValue({ ...userProfile, onboardedAt: new Date() }),
    updateNickname: vi.fn().mockResolvedValue(userProfile),
    updateProfileImage: vi.fn().mockResolvedValue(userProfile),
    markDeletionPending: vi.fn().mockResolvedValue(undefined),
    clearDeletionPending: vi.fn().mockResolvedValue(undefined),
    anonymizeUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeProfileImageRepo(
  overrides: Partial<IProfileImageRepository> = {},
): IProfileImageRepository {
  return {
    createPending: vi.fn().mockResolvedValue(undefined),
    discardPending: vi.fn().mockResolvedValue(undefined),
    confirmPending: vi.fn().mockResolvedValue(userProfile),
    resetCurrent: vi.fn().mockResolvedValue({ ...userProfile, profileImage: null }),
    queueAllForDeletion: vi.fn().mockResolvedValue(undefined),
    queueLegacyObjectForDeletion: vi.fn().mockResolvedValue(undefined),
    findDeletePending: vi.fn().mockResolvedValue([]),
    queueStalePendingForDeletion: vi.fn().mockResolvedValue(undefined),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeAccountDeletionRepo(
  overrides: Partial<IAccountDeletionRepository> = {},
): IAccountDeletionRepository {
  return {
    finalizeDeletion: vi.fn().mockResolvedValue({ closedRoomIds: [] }),
    ...overrides,
  };
}

describe('UserService', () => {
  it('사용자 프로필을 반환한다', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    await expect(service.getMe('user-id')).resolves.toEqual(userProfile);
    expect(repo.findUserById).toHaveBeenCalledWith('user-id');
  });

  it('사용자를 찾지 못하면 AUTH_USER_NOT_FOUND를 반환한다', async () => {
    const repo = makeRepo({
      findUserById: vi.fn().mockResolvedValue(null),
    });
    const service = new UserService(repo);

    await expect(service.getMe('missing-id')).rejects.toMatchObject({
      status: 404,
      code: 'AUTH_USER_NOT_FOUND',
    });
  });

  it('최근 방 목록을 반환한다', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    await expect(service.getRecentRooms('user-id')).resolves.toEqual(recentRooms);
    expect(repo.findRecentRooms).toHaveBeenCalledWith('user-id');
  });

  it('최근 방 목록이 비어 있으면 빈 배열을 반환한다', async () => {
    const repo = makeRepo({
      findRecentRooms: vi.fn().mockResolvedValue([]),
    });
    const service = new UserService(repo);

    await expect(service.getRecentRooms('user-id')).resolves.toEqual([]);
  });

  it('온보딩은 동의와 공백이 아닌 닉네임을 요구한다', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    await expect(
      service.completeOnboarding('user-id', { nickname: ' Alice ', ageAndTermsAgreed: false }),
    ).rejects.toMatchObject({ status: 400, code: ERROR_CODES.VALIDATION_ERROR });
    await expect(
      service.completeOnboarding('user-id', { nickname: '   ', ageAndTermsAgreed: true }),
    ).rejects.toMatchObject({ status: 400, code: ERROR_CODES.VALIDATION_ERROR });

    await service.completeOnboarding('user-id', { nickname: ' Alice ', ageAndTermsAgreed: true });
    expect(repo.completeOnboarding).toHaveBeenLastCalledWith('user-id', { nickname: 'Alice' });
  });

  it('닉네임 변경은 공백을 제거하고 빈 값은 거부한다', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    expect(() => service.updateNickname('user-id', ' ')).toThrow(
      expect.objectContaining({
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
      }),
    );
    await service.updateNickname('user-id', '  New name  ');
    expect(repo.updateNickname).toHaveBeenCalledWith('user-id', 'New name');
  });

  it('허용된 이미지 형식만 해당 사용자의 서명 업로드 경로를 발급한다', async () => {
    const repo = makeRepo();
    const storage = {
      createSignedUploadUrl: vi.fn().mockResolvedValue({ token: 'signed-token' }),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    };
    const profileImageRepo = makeProfileImageRepo();
    const service = new UserService(repo, undefined, storage, 'profile-images', profileImageRepo);

    await expect(
      service.createProfileImageUploadUrl('user-id', { mimeType: 'image/gif' as 'image/png' }),
    ).rejects.toMatchObject({ status: 400, code: ERROR_CODES.USER_PROFILE_IMAGE_INVALID_TYPE });

    await expect(
      service.createProfileImageUploadUrl('user-id', { mimeType: 'image/webp' }),
    ).resolves.toMatchObject({
      token: 'signed-token',
      bucket: 'profile-images',
      path: expect.stringMatching(/^user-id\/.+\.webp$/),
    });
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^user-id\/.+\.webp$/),
    );
    expect(profileImageRepo.createPending).toHaveBeenCalledWith(
      'user-id',
      expect.stringMatching(/^user-id\/.+\.webp$/),
    );
  });

  it('프로필 이미지 확정은 본인 경로만 허용하고 이전 이미지는 정리한다', async () => {
    const previousUrl =
      'https://project.supabase.co/storage/v1/object/public/profile-images/user-id/old.png';
    const repo = makeRepo({
      findUserById: vi.fn().mockResolvedValue({ ...userProfile, profileImage: previousUrl }),
    });
    const storage = {
      createSignedUploadUrl: vi.fn(),
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example/new.webp'),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const profileImageRepo = makeProfileImageRepo({
      findDeletePending: vi.fn().mockResolvedValue([
        {
          id: 'old-object',
          userId: 'user-id',
          path: 'user-id/old.png',
          status: 'delete_pending',
          createdAt: new Date(),
        },
      ]),
    });
    const service = new UserService(repo, undefined, storage, 'profile-images', profileImageRepo);

    await expect(
      service.confirmProfileImageUpload('user-id', 'other-user/new.webp'),
    ).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    await service.confirmProfileImageUpload('user-id', 'user-id/new.webp');

    expect(storage.getPublicUrl).toHaveBeenCalledWith('user-id/new.webp');
    expect(profileImageRepo.confirmPending).toHaveBeenCalledWith(
      'user-id',
      'user-id/new.webp',
      'https://cdn.example/new.webp',
    );
    expect(profileImageRepo.queueLegacyObjectForDeletion).toHaveBeenCalledWith(
      'user-id',
      'user-id/old.png',
    );
    expect(storage.remove).toHaveBeenCalledWith('user-id/old.png');
    expect(profileImageRepo.deleteObject).toHaveBeenCalledWith('old-object');
  });

  it('이미지 초기화와 회원 탈퇴 때 기존 이미지를 삭제하고 탈퇴 처리를 완료한다', async () => {
    const previousUrl =
      'https://project.supabase.co/storage/v1/object/public/profile-images/user-id/old.png';
    const repo = makeRepo({
      findUserById: vi.fn().mockResolvedValue({ ...userProfile, profileImage: previousUrl }),
    });
    const roomService = { finalizeClosedRoom: vi.fn().mockResolvedValue(undefined) };
    const storage = {
      createSignedUploadUrl: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const profileImageRepo = makeProfileImageRepo({
      findDeletePending: vi.fn().mockResolvedValue([
        {
          id: 'old-object',
          userId: 'user-id',
          path: 'user-id/old.png',
          status: 'delete_pending',
          createdAt: new Date(),
        },
      ]),
    });
    const disconnectUserSockets = vi.fn();
    const accountDeletionRepo = makeAccountDeletionRepo({
      finalizeDeletion: vi.fn().mockResolvedValue({ closedRoomIds: ['active-room'] }),
    });
    const service = new UserService(
      repo,
      roomService,
      storage,
      'profile-images',
      profileImageRepo,
      disconnectUserSockets,
      accountDeletionRepo,
    );

    await service.resetProfileImage('user-id');
    expect(profileImageRepo.resetCurrent).toHaveBeenCalledWith('user-id');
    expect(storage.remove).toHaveBeenCalledWith('user-id/old.png');

    await service.deleteAccount('user-id');
    expect(repo.markDeletionPending).toHaveBeenCalledWith('user-id');
    expect(disconnectUserSockets).toHaveBeenCalledWith('user-id');
    expect(vi.mocked(repo.markDeletionPending).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(disconnectUserSockets).mock.invocationCallOrder[0],
    );
    expect(vi.mocked(repo.markDeletionPending).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(accountDeletionRepo.finalizeDeletion).mock.invocationCallOrder[0],
    );
    expect(accountDeletionRepo.finalizeDeletion).toHaveBeenCalledWith('user-id', 'profile-images');
    expect(roomService.finalizeClosedRoom).toHaveBeenCalledWith('active-room');
    expect(storage.remove).toHaveBeenCalledTimes(1);
  });

  it('회원 탈퇴 DB 확정에 실패하면 pending을 원복하고 Room 알림을 보내지 않는다', async () => {
    const repo = makeRepo();
    const roomService = { finalizeClosedRoom: vi.fn() };
    const storage = {
      createSignedUploadUrl: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    };
    const profileImageRepo = makeProfileImageRepo();
    const accountDeletionRepo = makeAccountDeletionRepo({
      finalizeDeletion: vi.fn().mockRejectedValue(new Error('database unavailable')),
    });
    const disconnectUserSockets = vi.fn();
    const service = new UserService(
      repo,
      roomService,
      storage,
      'profile-images',
      profileImageRepo,
      disconnectUserSockets,
      accountDeletionRepo,
    );

    await expect(service.deleteAccount('user-id')).rejects.toThrow('database unavailable');

    expect(repo.markDeletionPending).toHaveBeenCalledWith('user-id');
    expect(disconnectUserSockets).toHaveBeenCalledWith('user-id');
    expect(repo.clearDeletionPending).toHaveBeenCalledWith('user-id');
    expect(roomService.finalizeClosedRoom).not.toHaveBeenCalled();
  });

  it('DB 확정 뒤 Room 알림이 실패해도 탈퇴 pending을 원복하지 않는다', async () => {
    const loggerError = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const repo = makeRepo();
    const roomService = {
      finalizeClosedRoom: vi.fn().mockRejectedValue(new Error('socket unavailable')),
    };
    const service = new UserService(
      repo,
      roomService,
      { createSignedUploadUrl: vi.fn(), getPublicUrl: vi.fn(), remove: vi.fn() },
      'profile-images',
      makeProfileImageRepo(),
      vi.fn(),
      makeAccountDeletionRepo({
        finalizeDeletion: vi.fn().mockResolvedValue({ closedRoomIds: ['active-room'] }),
      }),
    );

    await expect(service.deleteAccount('user-id')).resolves.toBeUndefined();

    expect(roomService.finalizeClosedRoom).toHaveBeenCalledWith('active-room');
    expect(repo.clearDeletionPending).not.toHaveBeenCalled();
    loggerError.mockRestore();
  });
});
