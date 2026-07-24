'use client';

import { useState } from 'react';

import { Button, Input } from '@/shared/components/ui';

import { useUpdateNickname } from '../hooks/useAuth';

export function NicknameEditor({ initialNickname }: { initialNickname: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(initialNickname);
  const updateNickname = useUpdateNickname();
  const unchanged = nickname.trim() === initialNickname.trim();

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3">
        <span>{initialNickname}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setNickname(initialNickname);
            setIsEditing(true);
          }}
        >
          수정하기
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        updateNickname.mutate(nickname, { onSuccess: () => setIsEditing(false) });
      }}
    >
      <Input
        value={nickname}
        maxLength={20}
        autoFocus
        onChange={(event) => setNickname(event.target.value)}
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!nickname.trim() || unchanged}
          isLoading={updateNickname.isPending}
        >
          저장
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={updateNickname.isPending}
          onClick={() => {
            setNickname(initialNickname);
            setIsEditing(false);
          }}
        >
          취소
        </Button>
      </div>
      {updateNickname.isError ? (
        <p className="text-sm text-destructive">닉네임을 저장하지 못했어요.</p>
      ) : null}
    </form>
  );
}
