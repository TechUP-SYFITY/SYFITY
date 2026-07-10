// Room 채팅 UI에서 사용하는 시간 포맷터를 제공한다.
export function formatChatTime(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
