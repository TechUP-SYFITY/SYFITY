'use client';

// Host가 자신의 개인 Playlist를 현재 Room 재생목록 끝에 불러오는(append) 다이얼로그.
import { CircleCheck, Download, ListMusic, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIconBadge,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { useToast } from '@/shared/components/ui/Toast';
import { cn } from '@/shared/lib/utils';

import { CreatePlaylistDialog } from './CreatePlaylistDialog';
import { useImportPlaylistToRoom, useMyPlaylists } from '../hooks/personalPlaylistHooks';
import type { ImportPlaylistToRoomResult } from '../types/personalPlaylistTypes';

interface ImportToRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

export function ImportToRoomDialog({ open, onOpenChange, roomId }: ImportToRoomDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-105">
        <ImportForm onOpenChange={onOpenChange} roomId={roomId} />
      </DialogContent>
    </Dialog>
  );
}

function buildResultMessage(result: ImportPlaylistToRoomResult): string {
  const skips: string[] = [];
  if (result.duplicateCount > 0) skips.push(`중복 ${result.duplicateCount}`);
  if (result.unavailableCount > 0) skips.push(`재생불가 ${result.unavailableCount}`);
  const skipText = skips.length > 0 ? ` · ${skips.join(' · ')} 건너뜀` : '';

  if (result.addedCount === 0) {
    return skips.length > 0
      ? `추가할 새 곡이 없어요 (${skips.join(' · ')})`
      : '추가할 새 곡이 없어요';
  }

  return `${result.addedCount}곡 추가${skipText}`;
}

function ImportForm({ onOpenChange, roomId }: Omit<ImportToRoomDialogProps, 'open'>) {
  const { data, isLoading } = useMyPlaylists();
  const importToRoom = useImportPlaylistToRoom(roomId);
  const { pushToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const playlists = data?.playlists ?? [];
  // 리스트는 있지만 전부 0곡이면 고를 수 있는 항목이 하나도 없다.
  const hasNoImportablePlaylist =
    playlists.length > 0 && playlists.every((playlist) => playlist.itemCount === 0);
  // 선택 후 목록이 갱신되어 해당 리스트가 비었을 수도 있으므로 제출 시점에 다시 확인한다.
  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedId);
  const canImport = selectedPlaylist !== undefined && selectedPlaylist.itemCount > 0;
  const errorMessage = importToRoom.isError
    ? '불러오기에 실패했어요. 다시 시도해 주세요.'
    : undefined;

  const handleImport = () => {
    if (!selectedId || !canImport || importToRoom.isPending) {
      return;
    }

    importToRoom.mutate(
      { personalPlaylistId: selectedId },
      {
        onSuccess: (result) => {
          onOpenChange(false);
          pushToast({
            title: buildResultMessage(result),
            variant: result.addedCount > 0 ? 'success' : 'info',
            icon: <CircleCheck aria-hidden />,
          });
        },
      },
    );
  };

  const renderPicker = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      );
    }

    if (playlists.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-6 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/5 text-white/40">
            <ListMusic className="size-5" aria-hidden />
          </span>
          <p className="text-sm text-white/70">먼저 내 플레이리스트를 만들어 보세요</p>
          <Button
            type="button"
            variant="primary-soft"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-4" aria-hidden />새 플레이리스트 만들기
          </Button>
        </div>
      );
    }

    return (
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {playlists.map((playlist) => {
          const selected = playlist.id === selectedId;
          // 곡이 없는 리스트는 불러와도 추가되는 곡이 없으므로 선택 자체를 막는다.
          // (서버는 docs/12 §6.3대로 빈 리스트도 허용하지만, 헛된 왕복을 미리 끊는다.)
          const isEmpty = playlist.itemCount === 0;

          return (
            <button
              key={playlist.id}
              type="button"
              disabled={isEmpty}
              onClick={() => setSelectedId(playlist.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                isEmpty && 'cursor-not-allowed opacity-45',
                selected && 'border-primary/40 bg-primary/8',
                !isEmpty && !selected && 'border-white/8 hover:border-white/15',
                isEmpty && 'border-white/8',
              )}
            >
              <span
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border',
                  selected ? 'border-primary bg-primary' : 'border-white/25',
                )}
              >
                {selected ? <span className="size-1.5 rounded-full bg-background" /> : null}
              </span>
              <span className="size-8 shrink-0 rounded-lg bg-linear-to-br from-primary/40 to-accent/40" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-white">{playlist.name}</span>
                <span className="text-xs text-white/40">
                  {isEmpty ? '곡 없음' : `${playlist.itemCount}곡`}
                </span>
              </span>
            </button>
          );
        })}

        {hasNoImportablePlaylist ? (
          <p className="px-1 pt-1 text-xs text-white/45">
            곡이 담긴 플레이리스트가 없어요. 내 플레이리스트에서 곡을 먼저 추가해주세요.
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <DialogIconBadge>
            <Download className="inline-block shrink-0" aria-hidden />
          </DialogIconBadge>
          <DialogTitle>내 플레이리스트 불러오기</DialogTitle>
        </div>
        <DialogCloseButton />
      </DialogHeader>

      <DialogBody>
        <DialogDescription className="mb-3">
          선택한 곡이 현재 재생목록 끝에 추가됩니다.
        </DialogDescription>

        {renderPicker()}

        {errorMessage ? <p className="mt-2 text-xs text-destructive">{errorMessage}</p> : null}
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
          type="button"
          variant="primary"
          size="lg"
          className="w-full sm:flex-1"
          isLoading={importToRoom.isPending}
          disabled={!canImport}
          onClick={handleImport}
        >
          <Download className="inline-block shrink-0" aria-hidden />
          끝에 추가
        </Button>
      </DialogFooter>

      <CreatePlaylistDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </>
  );
}
