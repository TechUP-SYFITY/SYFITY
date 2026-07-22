'use client';

import { ChevronRight, ListMusic } from 'lucide-react';
import Link from 'next/link';

import type { PersonalPlaylistSummary } from '../types/personalPlaylistTypes';

interface PersonalPlaylistCardProps {
  playlist: PersonalPlaylistSummary;
}

export function PersonalPlaylistCard({ playlist }: PersonalPlaylistCardProps) {
  return (
    <Link
      href={`/playlists/${playlist.id}`}
      className="group flex w-full items-center gap-4 rounded-2xl border border-white/8 bg-[rgba(17,17,19,0.72)] p-4 text-left transition-colors hover:border-primary/25 hover:bg-[rgba(23,23,26,0.85)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="relative flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-primary/25 to-accent/25 text-primary">
        <ListMusic className="size-5" aria-hidden />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-white">{playlist.name}</span>
      </span>

      <ChevronRight
        className="size-5 shrink-0 text-white/25 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}
