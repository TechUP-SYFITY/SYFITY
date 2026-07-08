'use client';

// Room 화면에서 사용하는 lucide 아이콘 매핑을 제공한다.
import {
  AudioLines,
  ChevronDown,
  Crown,
  Heart,
  ListMusic,
  MessageCircle,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  Send,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  type LucideIcon,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';

export type RoomIconName =
  | 'brand'
  | 'chat'
  | 'chevronDown'
  | 'crown'
  | 'like'
  | 'next'
  | 'pause'
  | 'play'
  | 'playlist'
  | 'previous'
  | 'refresh'
  | 'repeat'
  | 'send'
  | 'share'
  | 'shuffle'
  | 'users'
  | 'volume'
  | 'volumeMuted'
  | 'wifiOff';

const ROOM_ICONS: Record<RoomIconName, LucideIcon> = {
  brand: AudioLines,
  chat: MessageCircle,
  chevronDown: ChevronDown,
  crown: Crown,
  like: Heart,
  next: SkipForward,
  pause: Pause,
  play: Play,
  playlist: ListMusic,
  previous: SkipBack,
  refresh: RefreshCw,
  repeat: Repeat,
  send: Send,
  share: Share2,
  shuffle: Shuffle,
  users: Users,
  volume: Volume2,
  volumeMuted: VolumeX,
  wifiOff: WifiOff,
};

export function RoomIcon({ className = '', name }: { className?: string; name: RoomIconName }) {
  const Icon = ROOM_ICONS[name];

  return <Icon className={`inline-block shrink-0 ${className}`} aria-hidden />;
}
