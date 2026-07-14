// Playlist 곡 행의 썸네일 이미지를 표시한다.
import { cn } from '@/shared/lib/utils';
import type { PlaylistItem } from '@/shared/types/domain';

interface PlaylistArtworkProps {
  item: PlaylistItem;
}

export function PlaylistArtwork({ item }: PlaylistArtworkProps) {
  return (
    <span
      className={cn(
        'size-10 shrink-0 rounded-2xl bg-cover bg-center',
        item.status === 'unavailable' && 'opacity-45 grayscale',
      )}
      style={{ backgroundImage: `url(${getThumbnailUrl(item)})` }}
      role="img"
      aria-label={`${item.title} 썸네일`}
    />
  );
}

function getThumbnailUrl(item: PlaylistItem) {
  if (item.thumbnailUrl) {
    return item.thumbnailUrl;
  }

  return `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
}
