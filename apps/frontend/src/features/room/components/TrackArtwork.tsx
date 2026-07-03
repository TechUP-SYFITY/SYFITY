'use client';

// Mini player에서 현재 곡 썸네일 또는 대기 상태 아이콘을 표시한다.
import { Music2 } from 'lucide-react';

import type { PlaylistItem } from '@/shared/types/domain';

export function TrackArtwork({ track }: { track: PlaylistItem | undefined }) {
  if (track) {
    return (
      <span
        className="h-10 w-10 shrink-0 rounded-2xl bg-cover bg-center"
        style={{ backgroundImage: `url(${getTrackThumbnailUrl(track)})` }}
        role="img"
        aria-label={`${track.title} 썸네일`}
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white/45">
      <Music2 className="h-4 w-4" aria-hidden />
    </div>
  );
}

function getTrackThumbnailUrl(track: PlaylistItem) {
  if (track.thumbnailUrl) {
    return track.thumbnailUrl;
  }

  return `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
}
