import { randomUUID } from 'node:crypto';

import {
  ERROR_CODES,
  PROFILE_IMAGE_ALLOWED_MIME_TYPES,
  type ProfileImageMimeType,
} from '@syfity/shared';

import type { RoomService } from './room.service';
import { AppError } from '../errors/appError';
import type { IObjectStorage } from '../lib/storage/objectStorage.interface';
import type { IPersonalPlaylistRepository } from '../types/personal-playlist';
import type { IRoomRepository } from '../types/room';
import type { IUserRepository, RecentRoomRecord, UserProfileRecord } from '../types/user';
import { extractStoragePath } from '../utils/extractStoragePath';

const PROFILE_IMAGE_EXTENSION: Record<ProfileImageMimeType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export class UserService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly roomService?: Pick<RoomService, 'closeRoomAndBroadcast'>,
    private readonly roomRepo?: Pick<IRoomRepository, 'findRoomsByHostId'>,
    private readonly personalPlaylistRepo?: Pick<IPersonalPlaylistRepository, 'deleteAllByOwnerId'>,
    private readonly storageClient?: Pick<
      IObjectStorage,
      'createSignedUploadUrl' | 'getPublicUrl' | 'remove'
    >,
    private readonly profileImageBucket?: string,
  ) {}

  async getMe(userId: string): Promise<UserProfileRecord> {
    const user = await this.userRepo.findUserById(userId);
    if (!user) {
      throw new AppError(404, ERROR_CODES.AUTH_USER_NOT_FOUND, '사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  getRecentRooms(userId: string): Promise<RecentRoomRecord[]> {
    return this.userRepo.findRecentRooms(userId);
  }

  async completeOnboarding(
    userId: string,
    input: { nickname: string; ageAndTermsAgreed: boolean },
  ): Promise<UserProfileRecord & { onboardedAt: Date }> {
    if (!input.ageAndTermsAgreed) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, '연령 확인 및 약관 동의가 필요합니다.');
    }
    return this.userRepo.completeOnboarding(userId, {
      nickname: this.validateNickname(input.nickname),
    });
  }

  updateNickname(userId: string, rawNickname: string): Promise<UserProfileRecord> {
    return this.userRepo.updateNickname(userId, this.validateNickname(rawNickname));
  }

  async createProfileImageUploadUrl(
    userId: string,
    input: { mimeType: ProfileImageMimeType },
  ): Promise<{ path: string; token: string; bucket: string }> {
    if (!PROFILE_IMAGE_ALLOWED_MIME_TYPES.includes(input.mimeType)) {
      throw new AppError(
        400,
        ERROR_CODES.USER_PROFILE_IMAGE_INVALID_TYPE,
        '지원하지 않는 이미지 형식입니다.',
      );
    }
    const storageClient = this.requireStorageClient();
    const path = `${userId}/${randomUUID()}.${PROFILE_IMAGE_EXTENSION[input.mimeType]}`;
    const { token } = await storageClient.createSignedUploadUrl(path);
    return { path, token, bucket: this.requireProfileImageBucket() };
  }

  async confirmProfileImageUpload(userId: string, path: string): Promise<UserProfileRecord> {
    if (!path.startsWith(`${userId}/`)) {
      throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, '본인 소유 경로만 확인할 수 있습니다.');
    }
    const storageClient = this.requireStorageClient();
    const currentUser = await this.userRepo.findUserById(userId);
    const updated = await this.userRepo.updateProfileImage(
      userId,
      storageClient.getPublicUrl(path),
    );
    await this.cleanupPreviousProfileImage(currentUser?.profileImage ?? null);
    return updated;
  }

  async resetProfileImage(userId: string): Promise<UserProfileRecord> {
    const currentUser = await this.userRepo.findUserById(userId);
    const updated = await this.userRepo.updateProfileImage(userId, null);
    await this.cleanupPreviousProfileImage(currentUser?.profileImage ?? null);
    return updated;
  }

  async deleteAccount(userId: string): Promise<void> {
    const roomRepo = this.requireRoomRepo();
    const roomService = this.requireRoomService();
    const personalPlaylistRepo = this.requirePersonalPlaylistRepo();
    const hostedRooms = await roomRepo.findRoomsByHostId(userId);
    for (const room of hostedRooms.filter((hostedRoom) => hostedRoom.status === 'active')) {
      await roomService.closeRoomAndBroadcast(room.id, userId);
    }
    const currentUser = await this.userRepo.findUserById(userId);
    await this.cleanupPreviousProfileImage(currentUser?.profileImage ?? null);
    await personalPlaylistRepo.deleteAllByOwnerId(userId);
    await this.userRepo.anonymizeUser(userId);
  }

  private validateNickname(rawNickname: string): string {
    const nickname = rawNickname.trim();
    if (!nickname) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, '닉네임을 입력해주세요.');
    }
    return nickname;
  }

  private async cleanupPreviousProfileImage(previousUrl: string | null): Promise<void> {
    if (!previousUrl) return;
    const path = extractStoragePath(previousUrl, this.requireProfileImageBucket());
    if (!path) return;
    await this.requireStorageClient()
      .remove(path)
      .catch(() => undefined);
  }

  private requireStorageClient(): Pick<
    IObjectStorage,
    'createSignedUploadUrl' | 'getPublicUrl' | 'remove'
  > {
    if (!this.storageClient) throw new Error('Profile image storage is not configured.');
    return this.storageClient;
  }

  private requireProfileImageBucket(): string {
    if (!this.profileImageBucket) throw new Error('Profile image bucket is not configured.');
    return this.profileImageBucket;
  }

  private requireRoomService(): Pick<RoomService, 'closeRoomAndBroadcast'> {
    if (!this.roomService) throw new Error('Room service is not configured.');
    return this.roomService;
  }

  private requireRoomRepo(): Pick<IRoomRepository, 'findRoomsByHostId'> {
    if (!this.roomRepo) throw new Error('Room repository is not configured.');
    return this.roomRepo;
  }

  private requirePersonalPlaylistRepo(): Pick<IPersonalPlaylistRepository, 'deleteAllByOwnerId'> {
    if (!this.personalPlaylistRepo)
      throw new Error('Personal playlist repository is not configured.');
    return this.personalPlaylistRepo;
  }
}
