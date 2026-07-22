// 나만의 Playlist 목 데이터. (테스트/스토리북용) 백엔드 PersonalPlaylist 스펙 기준.
import type { PersonalPlaylistItem } from '@syfity/shared';

export interface PersonalPlaylistSeed {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: PersonalPlaylistItem[];
}

const item = (
  id: string,
  videoId: string,
  title: string,
  channelTitle: string,
  duration: number,
  position: number,
  status: PersonalPlaylistItem['status'] = 'available',
): PersonalPlaylistItem => ({
  id,
  videoId,
  title,
  channelTitle,
  duration,
  position,
  status,
  thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
});

// p1은 Room 픽스처의 "Night Changes"(syFZfO_wfMQ)를 포함 → 불러오기 시 중복 스킵 시연.
// 또한 duration 0 항목 → 재생불가 스킵 시연. position은 백엔드 규약대로 1-based.
export const personalPlaylistSeeds: PersonalPlaylistSeed[] = [
  {
    id: 'pl-night-drive',
    name: '밤 드라이브',
    createdAt: '2026-07-18T10:00:00.000Z',
    updatedAt: '2026-07-20T12:00:00.000Z',
    items: [
      item('ppi-1', 'syFZfO_wfMQ', 'Night Changes', 'One Direction', 226, 1),
      item('ppi-2', 'FTQbiNvZqaY', 'Instant Crush', 'Daft Punk', 337, 2),
      item('ppi-3', 'MwpMEbgC7DA', 'Nightcall', 'Kavinsky', 258, 3),
      item('ppi-4', 'unavailable1', 'Unavailable Track', 'Unknown', 0, 4, 'unavailable'),
    ],
  },
  {
    id: 'pl-focus-lofi',
    name: '집중 로파이',
    createdAt: '2026-07-19T09:00:00.000Z',
    updatedAt: '2026-07-19T09:30:00.000Z',
    items: [
      item('ppi-5', '5qap5aO4i9A', 'lofi hip hop radio', 'Lofi Girl', 300, 1),
      item('ppi-6', 'DWcJFNfaw9c', 'Chillhop Essentials', 'Chillhop', 280, 2),
    ],
  },
  {
    id: 'pl-empty-playlist',
    name: '빈 플레이리스트',
    createdAt: '2026-07-19T09:00:00.000Z',
    updatedAt: '2026-07-19T09:30:00.000Z',
    items: [],
  },
];
