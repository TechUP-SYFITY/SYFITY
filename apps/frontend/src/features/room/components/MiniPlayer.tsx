'use client';

// Room 하단에 고정되는 미니 플레이어 UI를 표시한다.
import type { PlaylistItem } from '@/shared/types/domain';

import { formatDuration } from './roomFormatters';
import { RoomIcon } from './RoomIcon';
import { TrackArtwork } from './TrackArtwork';

export function MiniPlayer({
  currentTrack,
  isPlaying,
}: {
  currentTrack: PlaylistItem | undefined;
  isPlaying: boolean;
}) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center gap-4 border-t border-white/[0.08] bg-[#09090b]/[0.97] px-5 pt-px backdrop-blur lg:static lg:px-6">
      <div className="flex min-w-0 flex-[0_0_224px] items-center gap-3">
        <TrackArtwork track={currentTrack} />
        <div className="min-w-0 flex-[0_1_84px]">
          <p className="truncate text-xs font-semibold text-white">
            {currentTrack?.title ?? '재생 대기'}
          </p>
          <p className="truncate text-xs text-white/45">
            {currentTrack?.channelTitle ?? '곡을 추가해보세요'}
          </p>
        </div>
        <button className="hidden text-white/35 sm:block" type="button" aria-label="좋아요">
          <RoomIcon name="like" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
        <div className="flex h-9 items-center justify-center gap-4">
          <button
            className="hidden h-4 w-4 items-center justify-center text-xs text-white/42 md:flex"
            type="button"
            aria-label="셔플"
          >
            <RoomIcon name="shuffle" className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-5 w-5 items-center justify-center text-sm text-white/55"
            type="button"
            aria-label="이전 곡"
          >
            <RoomIcon name="previous" className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#72f4a4] text-xs font-bold text-[#07150d] shadow-[0_0_9px_rgba(114,244,164,0.31)]"
            type="button"
            aria-label={isPlaying ? '일시정지' : '재생'}
          >
            <RoomIcon name={isPlaying ? 'pause' : 'play'} className="h-4 w-4" />
          </button>
          <button
            className="flex h-5 w-5 items-center justify-center text-sm text-white/55"
            type="button"
            aria-label="다음 곡"
          >
            <RoomIcon name="next" className="h-4 w-4" />
          </button>
          <button
            className="hidden h-4 w-4 items-center justify-center text-xs text-white/42 md:flex"
            type="button"
            aria-label="반복 재생"
          >
            <RoomIcon name="repeat" className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="hidden w-full max-w-96 items-center gap-2 text-xs leading-4 text-white/38 lg:flex">
          <span>1:23</span>
          <div className="relative h-1 min-w-0 flex-1 rounded-full bg-white/10">
            <div className="relative h-full w-[36%] rounded-full bg-gradient-to-r from-[#72f4a4] to-[#885cf6]">
              <span className="absolute top-1/2 right-0 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#09090b] bg-[#72f4a4] shadow-[0_0_8px_rgba(114,244,164,0.8)]" />
            </div>
          </div>
          <span>{currentTrack ? formatDuration(currentTrack.duration) : '0:00'}</span>
        </div>
      </div>

      <div className="hidden flex-[0_0_144px] items-center justify-end gap-2 lg:flex">
        <RoomIcon name="volume" className="h-3.5 w-3.5 text-white/42" />
        <div className="h-1 w-[123px] rounded-full bg-white/10">
          <div className="h-full w-3/4 rounded-full bg-white/38" />
        </div>
      </div>
    </footer>
  );
}
