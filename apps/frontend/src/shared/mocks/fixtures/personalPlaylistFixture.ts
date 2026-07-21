// 나만의 Playlist 목 데이터. 백엔드 연동 전 퍼블리싱/QA용 시나리오 픽스처.
import type { PlaylistItem } from '@/shared/types/domain';

export interface PersonalPlaylistSeed {
  id: string;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  updatedAt: string;
  items: PlaylistItem[];
}

const item = (
  id: string,
  videoId: string,
  title: string,
  channelTitle: string,
  duration: number,
  position: number,
  status: PlaylistItem['status'] = 'available',
): PlaylistItem => ({
  id,
  videoId,
  title,
  channelTitle,
  duration,
  position,
  status,
  addedBy: 'mock-user',
  thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
});

// p1은 Room 픽스처의 "Night Changes"(syFZfO_wfMQ)를 포함 → 불러오기 시 중복 스킵 시연.
// 또한 duration 0 항목 → 재생불가 스킵 시연.
export const personalPlaylistSeeds: PersonalPlaylistSeed[] = [
  {
    id: 'pl-night-drive',
    name: '밤 드라이브',
    description: '밤에 듣기 좋은 곡',
    coverUrl: null,
    updatedAt: '2026-07-20T12:00:00.000Z',
    items: [
      item('ppi-1', 'syFZfO_wfMQ', 'Night Changes', 'One Direction', 226, 0),
      item('ppi-2', 'FTQbiNvZqaY', 'Instant Crush', 'Daft Punk', 337, 1),
      item('ppi-3', 'MwpMEbgC7DA', 'Nightcall', 'Kavinsky', 258, 2),
      item('ppi-4', 'unavailable1', 'Unavailable Track', 'Unknown', 0, 3, 'unavailable'),
    ],
  },
  {
    id: 'pl-focus-lofi',
    name: '집중 로파이',
    description: null,
    coverUrl: null,
    updatedAt: '2026-07-19T09:30:00.000Z',
    items: [
      item('ppi-5', '5qap5aO4i9A', 'lofi hip hop radio', 'Lofi Girl', 300, 0),
      item('ppi-6', 'DWcJFNfaw9c', 'Chillhop Essentials', 'Chillhop', 280, 1),
    ],
  },
  {
    id: 'pl-empty-playlist',
    name: '빈 플레이리스트',
    description: null,
    coverUrl: null,
    updatedAt: '2026-07-19T09:30:00.000Z',
    items: [],
  },
];
