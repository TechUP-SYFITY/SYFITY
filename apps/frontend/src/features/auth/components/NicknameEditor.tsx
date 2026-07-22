'use client';

import { useState } from 'react';

import { Button, Input } from '@/shared/components/ui';

import { useUpdateNickname } from '../hooks/useAuth';

export function NicknameEditor({ initialNickname }: { initialNickname: string }) {
  const [nickname, setNickname] = useState(initialNickname);
  const updateNickname = useUpdateNickname();
  const unchanged = nickname.trim() === initialNickname.trim();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        updateNickname.mutate(nickname);
      }}
    >
      <Input
        value={nickname}
        maxLength={20}
        onChange={(event) => setNickname(event.target.value)}
      />
      <Button
        type="submit"
        className="self-start"
        disabled={!nickname.trim() || unchanged}
        isLoading={updateNickname.isPending}
      >
        저장
      </Button>
      {updateNickname.isError ? (
        <p className="text-sm text-destructive">닉네임을 저장하지 못했어요.</p>
      ) : null}
    </form>
  );
}
