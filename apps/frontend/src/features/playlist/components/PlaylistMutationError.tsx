// Playlist 변경 요청 실패 메시지를 패널 상단에 표시한다.
interface PlaylistMutationErrorProps {
  message: string;
}

export function PlaylistMutationError({ message }: PlaylistMutationErrorProps) {
  return (
    <p className="border-b border-border px-4 py-2 text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}
