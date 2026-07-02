'use client';

import Image from 'next/image';

import type { SearchVideo } from '../types/search';

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
      className={`flex min-h-[68px] items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-zinc-50 ${className}`}
    >
      <Image
        src={video.thumbnailUrl}
        alt={`${video.title} 썸네일`}
        width={44}
        height={44}
        unoptimized
        className="h-11 w-11 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-zinc-950">{video.title}</h3>
        <p className="mt-0.5 truncate text-xs font-medium text-zinc-500">{video.channelTitle}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-zinc-500">{video.duration}</span>
      <button
        type="button"
        disabled={isAdded}
        aria-label={`${video.title} 추가`}
        onClick={() => onAdd(video)}
        className="h-8 shrink-0 rounded-full bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:bg-zinc-200 disabled:text-zinc-500"
      >
        {isAdded ? '추가됨' : '추가'}
      </button>
    </article>
  );
}
