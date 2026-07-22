'use client';

import { useState } from 'react';

import { ERROR_CODES } from '@syfity/shared';

import { Avatar, AvatarFallback, AvatarImage, Button } from '@/shared/components/ui';
import { validateProfileImageFile } from '@/shared/lib/file/imageFile';

import { useResetProfileImage, useUploadProfileImage } from '../hooks/useAuth';

interface ProfileImagePickerProps {
  currentImage: string | null;
  nickname: string;
}

const profileImageValidationMessages: Record<string, string> = {
  [ERROR_CODES.USER_PROFILE_IMAGE_INVALID_TYPE]: 'PNG, JPEG, WebP 이미지만 업로드할 수 있어요.',
  [ERROR_CODES.USER_PROFILE_IMAGE_TOO_LARGE]: '이미지는 5MB 이하만 업로드할 수 있어요.',
};

export function ProfileImagePicker({ currentImage, nickname }: ProfileImagePickerProps) {
  const upload = useUploadProfileImage();
  const reset = useResetProfileImage();
  const [validationError, setValidationError] = useState<string | null>(null);
  const initial = nickname.trim().charAt(0).toUpperCase() || '?';
  const uploadError = upload.error instanceof Error ? upload.error.message : null;
  const error = validationError ?? uploadError;

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg">
        {currentImage ? <AvatarImage src={currentImage} alt={nickname} /> : null}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <label className="cursor-pointer text-sm font-semibold text-primary">
          이미지 선택
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const fileValidationError = validateProfileImageFile(file);
              if (fileValidationError) {
                setValidationError(profileImageValidationMessages[fileValidationError]);
                upload.reset();
                return;
              }
              setValidationError(null);
              upload.mutate(file);
            }}
          />
        </label>
        <Button
          variant="ghost"
          size="sm"
          disabled={!currentImage || reset.isPending}
          onClick={() => {
            setValidationError(null);
            reset.mutate();
          }}
        >
          기본 이미지로 변경
        </Button>
        {upload.isPending || reset.isPending ? (
          <span className="text-xs text-muted-foreground">업로드 중이에요</span>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
