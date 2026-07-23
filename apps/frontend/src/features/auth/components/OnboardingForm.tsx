'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button, Checkbox, Input } from '@/shared/components/ui';

import { ProfileImagePicker } from './ProfileImagePicker';
import { useCompleteOnboarding, useMe } from '../hooks/useAuth';

export function OnboardingForm() {
  const router = useRouter();
  const { data: me } = useMe();
  const [nickname, setNickname] = useState('');
  const [agreed, setAgreed] = useState(false);
  const complete = useCompleteOnboarding();
  const hasPrefilledNickname = useRef(false);

  useEffect(() => {
    if (!hasPrefilledNickname.current && me?.nickname) {
      setNickname(me.nickname);
      hasPrefilledNickname.current = true;
    }
  }, [me?.nickname]);

  return (
    <form
      className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-2xl border border-border bg-card p-6"
      onSubmit={(event) => {
        event.preventDefault();
        complete.mutate(
          { nickname, ageAndTermsAgreed: agreed },
          { onSuccess: () => router.replace('/home') },
        );
      }}
    >
      <h1 className="text-2xl font-bold">프로필 설정</h1>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">프로필 사진</span>
        <ProfileImagePicker currentImage={me?.profileImage ?? null} nickname={nickname} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">닉네임</span>
        <Input
          value={nickname}
          placeholder="닉네임"
          maxLength={20}
          onChange={(event) => setNickname(event.target.value)}
        />
      </div>
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <Checkbox
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
          className="mt-0.5"
        />
        <span className="flex flex-col gap-1">
          <span>
            저는 만 14세 이상이며{' '}
            <Link href="/terms" className="text-primary underline">
              이용약관
            </Link>
            과{' '}
            <Link href="/privacy" className="text-primary underline">
              개인정보처리방침
            </Link>
            에 동의합니다.
          </span>
          <span className="text-xs">
            Room에 참여하면 호스트의 재생 제어에 따라 제 화면에서도 재생이 자동으로 시작될 수 있다는
            점을 확인했습니다.
          </span>
        </span>
      </label>
      <Button type="submit" disabled={!nickname.trim() || !agreed} isLoading={complete.isPending}>
        시작하기
      </Button>
    </form>
  );
}
