'use client';

// 나만의 Playlist 라이브러리 화면: 헤더 + 가로 리스트 + 상태 + 생성 다이얼로그.
import { CircleAlert, ListMusic, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/ui/Button';
import { ErrorState } from '@/shared/components/ui/ErrorState';

import { CreatePlaylistDialog } from '@/features/personal-playlist/components/CreatePlaylistDialog';
import { PersonalPlaylistCard } from '@/features/personal-playlist/components/PersonalPlaylistCard';
import { useMyPlaylists } from '@/features/personal-playlist/hooks/personalPlaylistHooks';

export function PersonalPlaylistLibrary() {
  const { data, isLoading, isError, refetch } = useMyPlaylists();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const playlists = data?.playlists ?? [];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="flex animate-pulse items-center gap-4 rounded-2xl border border-white/8 bg-[rgba(17,17,19,0.72)] p-4"
            >
              <div className="size-13 shrink-0 rounded-2xl bg-white/8" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-4 w-2/5 rounded-sm bg-white/8" />
                <div className="h-3 w-1/4 rounded-sm bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex justify-center py-8">
          <ErrorState
            icon={<CircleAlert className="size-9 text-destructive" aria-hidden />}
            title="플레이리스트를 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
            action={{ label: '다시 시도', onClick: () => refetch() }}
          />
        </div>
      );
    }

    if (playlists.length === 0) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-white/3 px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/5 text-white/40">
            <ListMusic className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-white">아직 플레이리스트가 없어요</p>
            <p className="text-xs text-white/45">첫 플레이리스트를 만들어 곡을 모아보세요</p>
          </div>
          <Button
            type="button"
            variant="gradient"
            size="sm"
            className="rounded-full"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus />새 플레이리스트
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {playlists.map((playlist) => (
          <PersonalPlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-205 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white">내 플레이리스트</h1>
          {playlists.length > 0 ? (
            <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-xs font-semibold text-white/50">
              {playlists.length}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="gradient"
          size="sm"
          className="rounded-full"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus />새 플레이리스트
        </Button>
      </div>

      {renderContent()}

      <CreatePlaylistDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
