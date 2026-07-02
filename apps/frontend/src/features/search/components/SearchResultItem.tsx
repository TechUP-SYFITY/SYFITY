'use client';

import Image from 'next/image';

import { PlusIcon } from './SearchIcons';
import type { SearchVideo } from '../types/search';
import { formatDuration } from '../utils/formatDuration';

interface SearchResultItemProps {
  video: SearchVideo;
  onAdd: (video: SearchVideo) => void;
  isAdded?: boolean;
  className?: string;
}

export function SearchResultItem({
  video,
  onAdd,
  isAdded = false,
  className = '',
}: SearchResultItemProps) {
  return (
    <article
      className={`flex min-h-[68px] items-center gap-3 border-b border-white/[0.05] px-4 py-3 transition hover:bg-white/[0.03] ${className}`}
    >
      <Image
        src={video.thumbnailUrl}
        alt={`${video.title} 썸네일`}
        width={44}
        height={44}
        unoptimized
        className="h-11 w-11 shrink-0 rounded-2xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold leading-5 text-white">{video.title}</h3>
        <p className="truncate text-xs leading-4 text-white/45">{video.channelTitle}</p>
      </div>
      <span className="hidden shrink-0 text-xs leading-4 text-white/40 min-[390px]:block">
        {formatDuration(video.duration)}
      </span>
      <button
        type="button"
        disabled={isAdded}
        aria-label={`${video.title} 추가`}
        onClick={() => onAdd(video)}
        className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-2xl border border-[#72f4a4]/25 bg-[#72f4a4]/10 px-3 text-xs font-bold leading-4 text-[#72f4a4] transition hover:border-[#72f4a4]/45 hover:bg-[#72f4a4]/15 disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/35"
      >
        <PlusIcon className="h-3 w-3" />
        {isAdded ? '추가됨' : '추가'}
      </button>
    </article>
  );
}
