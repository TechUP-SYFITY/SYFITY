// Playlist 최초 조회 중 로딩 상태를 표시한다.
import { Loader2 } from 'lucide-react';

export function PlaylistLoadingState() {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-white/45" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      Playlist 불러오는 중
    </div>
  );
}
