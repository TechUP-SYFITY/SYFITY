// Playlist에 YouTube URL을 추가하는 입력 폼을 렌더링한다.
import { ListMusic, Plus } from 'lucide-react';

import { Button, Input } from '@/shared/components/ui';

interface PlaylistAddFormProps {
  errorMessage: string | undefined;
  isPending: boolean;
  isReady: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onYoutubeUrlChange: (value: string) => void;
  youtubeUrl: string;
}

export function PlaylistAddForm({
  errorMessage,
  isPending,
  isReady,
  onSubmit,
  onYoutubeUrlChange,
  youtubeUrl,
}: PlaylistAddFormProps) {
  return (
    <form className="flex gap-2 border-b border-border px-4 py-3" onSubmit={onSubmit}>
      <Input
        className="min-w-0 rounded-xl border-border bg-input"
        error={errorMessage}
        leadingIcon={<ListMusic aria-hidden />}
        placeholder="YouTube URL"
        value={youtubeUrl}
        disabled={!isReady || isPending}
        onChange={(event) => onYoutubeUrlChange(event.target.value)}
      />
      <Button
        className="h-11 shrink-0 rounded-xl"
        disabled={!isReady || isPending}
        isLoading={isPending}
        type="submit"
      >
        {!isPending ? <Plus className="h-4 w-4" aria-hidden /> : null}
        추가
      </Button>
    </form>
  );
}
