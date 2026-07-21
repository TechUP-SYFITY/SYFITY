'use client';

// 나만의 Playlist 생성/수정 다이얼로그. 생성과 수정 겸용 폼.
import { ListMusic } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogIconBadge,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Input } from '@/shared/components/ui/Input';

import { useCreatePlaylist, useUpdatePlaylist } from '../hooks/personalPlaylistHooks';
import type { PersonalPlaylistSummary } from '../types/personalPlaylistTypes';

const MAX_NAME_LENGTH = 30;
const MAX_DESC_LENGTH = 80;

interface CreatePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist?: PersonalPlaylistSummary; // 있으면 수정 모드
  onCreated?: (playlist: { id: string; name: string }) => void;
}

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  playlist,
  onCreated,
}: CreatePlaylistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-105">
        {/* playlist가 바뀌면 폼을 리마운트해 입력값을 대상 기준으로 초기화한다. */}
        <PlaylistForm
          key={playlist?.id ?? 'new'}
          onOpenChange={onOpenChange}
          playlist={playlist}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  );
}

function PlaylistForm({
  onOpenChange,
  playlist,
  onCreated,
}: Omit<CreatePlaylistDialogProps, 'open'>) {
  const isEdit = Boolean(playlist);
  const [name, setName] = useState(playlist?.name ?? '');
  const [description, setDescription] = useState(playlist?.description ?? '');

  const createPlaylist = useCreatePlaylist();
  const updatePlaylist = useUpdatePlaylist(playlist?.id ?? '');
  const mutation = isEdit ? updatePlaylist : createPlaylist;

  const trimmedName = name.trim();
  const errorMessage = mutation.isError ? '저장에 실패했어요. 다시 시도해 주세요.' : undefined;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (trimmedName.length === 0 || mutation.isPending) {
      return;
    }

    const body = {
      name: trimmedName,
      description: description.trim() || undefined,
    };

    mutation.mutate(body, {
      onSuccess: (result) => {
        onOpenChange(false);
        onCreated?.(result);
      },
    });
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <DialogIconBadge>
            <ListMusic className="inline-block shrink-0" aria-hidden />
          </DialogIconBadge>
          <DialogTitle>{isEdit ? '플레이리스트 수정' : '새 플레이리스트'}</DialogTitle>
        </div>
        <DialogCloseButton />
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="playlist-name"
              className="flex items-center gap-1 text-xs font-semibold text-white/65"
            >
              이름 <span className="text-primary">*</span>
            </label>
            <Input
              id="playlist-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="밤 드라이브"
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              error={errorMessage}
              showCount
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="playlist-desc" className="text-xs font-semibold text-white/65">
              설명
            </label>
            <Input
              id="playlist-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="어떤 플레이리스트인가요? (선택)"
              maxLength={MAX_DESC_LENGTH}
              showCount
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full sm:flex-1"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full sm:flex-1"
            isLoading={mutation.isPending}
            disabled={trimmedName.length === 0}
          >
            {isEdit ? '저장' : '만들기'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
