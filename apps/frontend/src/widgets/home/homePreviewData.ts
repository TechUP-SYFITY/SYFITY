import type { RoomSummary } from '@/shared/types/domain';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const previewRecentRooms: RoomSummary[] = [
  {
    id: 'preview-dawn-kpop',
    name: '새벽 K-Pop 감성방',
    inviteCode: '3F9A2C',
    lastJoinedAt: minutesAgo(0),
  },
  {
    id: 'preview-pop-playlist',
    name: '팝 플레이리스트방',
    inviteCode: '8KD4QP',
    lastJoinedAt: minutesAgo(10),
  },
  {
    id: 'preview-lofi-study',
    name: 'Lo-fi 공부방 🎧',
    inviteCode: 'L0FI77',
    lastJoinedAt: minutesAgo(180),
  },
];
