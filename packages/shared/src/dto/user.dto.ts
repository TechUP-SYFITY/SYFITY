export type UserProfileResponse = {
  success: true;
  data: {
    id: string;
    email: string;
    nickname: string;
    profileImage: string | null;
    onboardedAt?: string | null;
  };
};

export type CompleteOnboardingRequest = {
  /** @minLength 1 @maxLength 20 */
  nickname: string;
  ageAndTermsAgreed: boolean;
};

export type CompleteOnboardingResponse = {
  success: true;
  data: {
    id: string;
    email: string;
    nickname: string;
    profileImage: string | null;
    onboardedAt: string;
  };
};

export type UpdateNicknameRequest = {
  /** @minLength 1 @maxLength 20 */
  nickname: string;
};

export type UpdateNicknameResponse = {
  success: true;
  data: {
    id: string;
    email: string;
    nickname: string;
    profileImage: string | null;
  };
};

export type CreateProfileImageUploadUrlRequest = {
  mimeType: ProfileImageMimeType;
};

export type CreateProfileImageUploadUrlResponse = {
  success: true;
  data: { path: string; token: string; bucket: string };
};

export type ConfirmProfileImageUploadRequest = {
  path: string;
};

export type UploadProfileImageResponse = {
  success: true;
  data: { profileImage: string | null };
};

export type RecentRoomsResponse = {
  success: true;
  data: {
    rooms: {
      id: string;
      name: string;
      inviteCode: string;
      lastJoinedAt: string;
    }[];
  };
};
import type { ProfileImageMimeType } from '../constants/profile-image';
