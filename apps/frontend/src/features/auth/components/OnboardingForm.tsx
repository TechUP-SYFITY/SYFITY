'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Input } from '@/shared/components/ui';

import { ProfileImagePicker } from './ProfileImagePicker';
import { useCompleteOnboarding, useMe } from '../hooks/useAuth';

export function OnboardingForm() {
  const router = useRouter();
  const { data: me } = useMe();
  const [nickname, setNickname] = useState('');
  const [agreed, setAgreed] = useState(false);
  const complete = useCompleteOnboarding();
  const actualNickname = nickname || me?.nickname || '';

  return (
    <form
      className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-2xl border border-border bg-card p-6"
      onSubmit={(event) => {
        event.preventDefault();
        complete.mutate(
          { nickname: actualNickname, ageAndTermsAgreed: agreed },
          { onSuccess: () => router.replace('/home') },
        );
      }}
    >
      <div>
        <h1 className="text-2xl font-bold">서비스 이용 설정</h1>
        <p className="mt-2 text-sm text-muted-foreground">프로필과 약관 동의를 완료해 주세요.</p>
      </div>
      <ProfileImagePicker currentImage={me?.profileImage ?? null} nickname={actualNickname} />
      <Input
        value={nickname}
        placeholder="닉네임"
        maxLength={20}
        onChange={(event) => setNickname(event.target.value)}
      />
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-1"
        />
        <span>
          저는 만 14세 이상이며{' '}
          <Link href="/terms" className="text-primary underline">
            이용약관
          </Link>
          과{' '}
          <Link href="/privacy" className="text-primary underline">
            개인정보처리방침
          </Link>
          에 동의합니다. Room에 참여하면 호스트의 재생 제어에 따라 제 화면에서도 재생이 자동으로
          시작될 수 있다는 점을 확인했습니다.
        </span>
      </label>
      <Button
        type="submit"
        disabled={!actualNickname.trim() || !agreed}
        isLoading={complete.isPending}
      >
        시작하기
      </Button>
    </form>
  );
}
