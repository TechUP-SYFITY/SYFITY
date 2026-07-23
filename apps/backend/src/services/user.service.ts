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
import type { IProfileImageRepository } from '../types/profile-image';
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
    private readonly profileImageRepo?: IProfileImageRepository,
    private readonly disconnectUserSockets?: (userId: string) => void,
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
    const profileImageRepo = this.requireProfileImageRepo();
    await profileImageRepo.createPending(userId, path);
    try {
      const { token } = await storageClient.createSignedUploadUrl(path);
      return { path, token, bucket: this.requireProfileImageBucket() };
    } catch (error) {
      await profileImageRepo.discardPending(userId, path);
      throw error;
    }
  }

  async confirmProfileImageUpload(userId: string, path: string): Promise<UserProfileRecord> {
    if (!path.startsWith(`${userId}/`)) {
      throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, '본인 소유 경로만 확인할 수 있습니다.');
    }
    const storageClient = this.requireStorageClient();
    const currentUser = await this.userRepo.findUserById(userId);
    const updated = await this.requireProfileImageRepo().confirmPending(
      userId,
      path,
      storageClient.getPublicUrl(path),
    );
    if (!updated) {
      throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, '확인할 수 없는 업로드 경로입니다.');
    }
    await this.queueLegacyProfileImageForDeletion(userId, currentUser?.profileImage ?? null);
    await this.cleanupQueuedProfileImages(userId);
    return updated;
  }

  async resetProfileImage(userId: string): Promise<UserProfileRecord> {
    const currentUser = await this.userRepo.findUserById(userId);
    await this.queueLegacyProfileImageForDeletion(userId, currentUser?.profileImage ?? null);
    const updated = await this.requireProfileImageRepo().resetCurrent(userId);
    await this.cleanupQueuedProfileImages(userId);
    return updated;
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.userRepo.markDeletionPending(userId);
    try {
      this.requireSocketDisconnector()(userId);
      const currentUser = await this.userRepo.findUserById(userId);
      await this.queueLegacyProfileImageForDeletion(userId, currentUser?.profileImage ?? null);
      await this.requireProfileImageRepo().queueAllForDeletion(userId);
      await this.cleanupQueuedProfileImages(userId, true);

      const roomRepo = this.requireRoomRepo();
      const roomService = this.requireRoomService();
      const personalPlaylistRepo = this.requirePersonalPlaylistRepo();
      const hostedRooms = await roomRepo.findRoomsByHostId(userId);
      for (const room of hostedRooms.filter((hostedRoom) => hostedRoom.status === 'active')) {
        await roomService.closeRoomAndBroadcast(room.id, userId);
      }
      await personalPlaylistRepo.deleteAllByOwnerId(userId);
      await this.userRepo.anonymizeUser(userId);
    } catch (error) {
      await this.userRepo.clearDeletionPending(userId);
      throw error;
    }
  }

  private validateNickname(rawNickname: string): string {
    const nickname = rawNickname.trim();
    if (!nickname) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, '닉네임을 입력해주세요.');
    }
    return nickname;
  }

  private async queueLegacyProfileImageForDeletion(
    userId: string,
    profileImageUrl: string | null,
  ): Promise<void> {
    if (!profileImageUrl) return;
    const path = extractStoragePath(profileImageUrl, this.requireProfileImageBucket());
    if (!path) return;
    await this.requireProfileImageRepo().queueLegacyObjectForDeletion(userId, path);
  }

  private async cleanupQueuedProfileImages(userId: string, strict = false): Promise<void> {
    const profileImageRepo = this.requireProfileImageRepo();
    for (const image of await profileImageRepo.findDeletePending(userId)) {
      try {
        await this.requireStorageClient().remove(image.path);
        await profileImageRepo.deleteObject(image.id);
      } catch (error) {
        if (strict) throw error;
      }
    }
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

  private requireProfileImageRepo(): IProfileImageRepository {
    if (!this.profileImageRepo) throw new Error('Profile image repository is not configured.');
    return this.profileImageRepo;
  }

  private requireSocketDisconnector(): (userId: string) => void {
    if (!this.disconnectUserSockets) throw new Error('Socket disconnector is not configured.');
    return this.disconnectUserSockets;
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
