'use client';

import { Avatar, AvatarFallback, AvatarImage, Button } from '@/shared/components/ui';
import { validateProfileImageFile } from '@/shared/lib/file/imageFile';

import { useResetProfileImage, useUploadProfileImage } from '../hooks/useAuth';

interface ProfileImagePickerProps {
  currentImage: string | null;
  nickname: string;
}

export function ProfileImagePicker({ currentImage, nickname }: ProfileImagePickerProps) {
  const upload = useUploadProfileImage();
  const reset = useResetProfileImage();
  const initial = nickname.trim().charAt(0).toUpperCase() || '?';
  const error = upload.error instanceof Error ? upload.error.message : null;

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
              const validationError = validateProfileImageFile(file);
              if (validationError) {
                upload.reset();
                return;
              }
              upload.mutate(file);
            }}
          />
        </label>
        <Button
          variant="ghost"
          size="sm"
          disabled={!currentImage || reset.isPending}
          onClick={() => reset.mutate()}
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
