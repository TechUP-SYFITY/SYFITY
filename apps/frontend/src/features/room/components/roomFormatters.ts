// Room 보조 UI에서 사용하는 시간과 길이 포맷터를 제공한다.
export function formatDuration(duration: number) {
  const minutes = Math.floor(duration / 60);
  const seconds = String(duration % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}
