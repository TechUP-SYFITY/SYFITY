import type { RoomSummary } from '@/shared/types/domain';

import type { MyRoomSummary } from '@/features/room/types/roomTypes';

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

export const previewMyRooms: MyRoomSummary[] = [
  {
    closedAt: null,
    id: 'preview-my-active-room',
    name: '내 플레이리스트 Room',
    status: 'active',
    updatedAt: minutesAgo(5),
  },
  {
    closedAt: minutesAgo(1_440),
    id: 'preview-my-closed-room',
    name: '지난 주말 음악 Room',
    status: 'closed',
    updatedAt: minutesAgo(1_440),
  },
];
