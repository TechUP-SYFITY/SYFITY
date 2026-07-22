'use client';

import { DeleteAccountDialog } from '@/features/auth/components/DeleteAccountDialog';
import { NicknameEditor } from '@/features/auth/components/NicknameEditor';
import { ProfileImagePicker } from '@/features/auth/components/ProfileImagePicker';
import { useMe } from '@/features/auth/hooks/useAuth';

export function SettingsPage() {
  const { data: me } = useMe();
  if (!me) return null;
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-10">
      <h1 className="text-2xl font-bold">계정</h1>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold">프로필 사진</h2>
        <ProfileImagePicker currentImage={me.profileImage} nickname={me.nickname} />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold">닉네임</h2>
        <NicknameEditor initialNickname={me.nickname} />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-2 font-semibold">이메일</h2>
        <p className="text-muted-foreground">{me.email}</p>
      </div>
      <div className="rounded-2xl border border-destructive/30 bg-card p-6">
        <h2 className="mb-4 font-semibold text-destructive">계정 삭제</h2>
        <DeleteAccountDialog />
      </div>
    </section>
  );
}
