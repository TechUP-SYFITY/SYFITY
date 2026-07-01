'use client';

// Room 페이지에서 Player, Playlist, Room Socket 흐름을 디자인 레이아웃에 연결한다.
import { useEffect, useRef, useState } from 'react';

import type { ChatMessage, PlaylistItem, RoomMember } from '@/shared/types/domain';

import { playbackCommands } from '@/features/player/playbackCommands';
import { PlayerPanel } from '@/features/player/PlayerPanel';
import { usePlayerStore } from '@/features/player/playerStore';
import { usePlaybackSocket } from '@/features/player/usePlaybackSocket';
import { usePlaylistSocket } from '@/features/playlist/playlistHooks';
import { PlaylistPanel } from '@/features/playlist/PlaylistPanel';
import { usePlaylistStore } from '@/features/playlist/playlistStore';
import { useJoinRoom } from '@/features/room/roomHooks';
import { useRoomStore } from '@/features/room/roomStore';
import { useRoomSocket } from '@/features/room/useRoomSocket';

interface RoomPageClientProps {
  roomId: string;
}

type RoomMobileTab = 'playlist' | 'members' | 'chat';

const FALLBACK_CURRENT_USER_ID = 'fallback-host';
const BRAND_MARK_PATH = '/assets/brand/syfity-mark.svg';
const ROOM_ICON_PATHS = {
  chat: '/assets/icons/room/chat.svg',
  chevronDown: '/assets/icons/room/chevron-down.svg',
  crown: '/assets/icons/room/crown.svg',
  like: '/assets/icons/room/like.svg',
  next: '/assets/icons/room/next.svg',
  pause: '/assets/icons/room/pause.svg',
  play: '/assets/icons/room/play.svg',
  playlist: '/assets/icons/room/playlist.svg',
  previous: '/assets/icons/room/previous.svg',
  refresh: '/assets/icons/room/refresh.svg',
  repeat: '/assets/icons/room/repeat.svg',
  send: '/assets/icons/room/send.svg',
  share: '/assets/icons/room/share.svg',
  shuffle: '/assets/icons/room/shuffle.svg',
  users: '/assets/icons/room/users.svg',
  volume: '/assets/icons/room/volume.svg',
  wifiOff: '/assets/icons/room/wifi-off.svg',
} as const;

type RoomIconName = keyof typeof ROOM_ICON_PATHS;

const FALLBACK_MEMBERS: RoomMember[] = [
  {
    id: 'fallback-host',
    nickname: '민지',
    profileImage: null,
    role: 'host',
    status: 'online',
    userId: 'fallback-host',
  },
  {
    id: 'fallback-member-1',
    nickname: '지민',
    profileImage: null,
    role: 'member',
    status: 'online',
    userId: 'fallback-member-1',
  },
  {
    id: 'fallback-member-2',
    nickname: '이수현',
    profileImage: null,
    role: 'member',
    status: 'online',
    userId: 'fallback-member-2',
  },
  {
    id: 'fallback-member-3',
    nickname: '박아린',
    profileImage: null,
    role: 'member',
    status: 'online',
    userId: 'fallback-member-3',
  },
  {
    id: 'fallback-member-4',
    nickname: '최태양',
    profileImage: null,
    role: 'member',
    status: 'offline',
    userId: 'fallback-member-4',
  },
  {
    id: 'fallback-member-5',
    nickname: '정우진',
    profileImage: null,
    role: 'member',
    status: 'offline',
    userId: 'fallback-member-5',
  },
];

const FALLBACK_PLAYLIST: PlaylistItem[] = [
  {
    addedBy: 'fallback-host',
    channelTitle: 'One Direction',
    duration: 226,
    id: 'fallback-night-changes',
    position: 1,
    status: 'available',
    thumbnailUrl: 'https://i.ytimg.com/vi/syFZfO_wfMQ/hqdefault.jpg',
    title: 'Night Changes',
    videoId: 'syFZfO_wfMQ',
  },
  {
    addedBy: 'fallback-member-1',
    channelTitle: 'BTS',
    duration: 199,
    id: 'fallback-dynamite',
    position: 2,
    status: 'available',
    thumbnailUrl: 'https://i.ytimg.com/vi/gdZLi9oWNZg/hqdefault.jpg',
    title: 'Dynamite',
    videoId: 'gdZLi9oWNZg',
  },
  {
    addedBy: 'fallback-member-2',
    channelTitle: 'Dua Lipa',
    duration: 203,
    id: 'fallback-levitating',
    position: 3,
    status: 'unavailable',
    thumbnailUrl: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg',
    title: 'Levitating',
    videoId: 'TUVcZfQe-Kw',
  },
  {
    addedBy: 'fallback-member-3',
    channelTitle: 'The Weeknd',
    duration: 202,
    id: 'fallback-blinding-lights',
    position: 4,
    status: 'available',
    thumbnailUrl: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    title: 'Blinding Lights',
    videoId: '4NRXx6U8ABQ',
  },
  {
    addedBy: 'fallback-member-4',
    channelTitle: 'Harry Styles',
    duration: 157,
    id: 'fallback-as-it-was',
    position: 5,
    status: 'available',
    thumbnailUrl: 'https://i.ytimg.com/vi/H5v3kku4y6Q/hqdefault.jpg',
    title: 'As It Was',
    videoId: 'H5v3kku4y6Q',
  },
];

const FALLBACK_CHATS: ChatMessage[] = [
  {
    createdAt: '2026-07-01T10:12:00.000Z',
    id: 'fallback-chat-1',
    message: '안녕하세요 다들~ ♫',
    nickname: '민지',
    type: 'user',
    userId: 'fallback-host',
  },
  {
    createdAt: '2026-07-01T10:13:00.000Z',
    id: 'fallback-chat-2',
    message: '오늘 좋은 곡들 많이 들을 것 같아요 ㅎㅎ',
    nickname: '지민',
    type: 'user',
    userId: 'fallback-member-1',
  },
  {
    createdAt: '2026-07-01T10:14:00.000Z',
    id: 'fallback-chat-3',
    message: 'Night Changes 진짜 최고 🙌',
    nickname: '이수현',
    type: 'user',
    userId: 'fallback-member-2',
  },
];

const AVATAR_TONES = [
  'from-[#f05274] to-[#7f4fd8]',
  'from-[#f59f45] to-[#f05274]',
  'from-[#40c4ff] to-[#7f4fd8]',
  'from-[#72f4a4] to-[#2b8c60]',
  'from-[#f4d772] to-[#e25d76]',
  'from-[#a78bfa] to-[#4ade80]',
];

const formatDuration = (duration: number) => {
  const minutes = Math.floor(duration / 60);
  const seconds = String(duration % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export function RoomPageClient({ roomId }: RoomPageClientProps) {
  const hasRequestedJoin = useRef(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<RoomMobileTab>('playlist');
  const joinRoom = useJoinRoom();
  const members = useRoomStore((state) => state.members);
  const roomFromStore = useRoomStore((state) => state.room);
  const setJoinedRoom = useRoomStore((state) => state.setJoinedRoom);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const playlist = usePlaylistStore((state) => state.playlist);
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);

  usePlaybackSocket(hasJoinedRoom);
  usePlaylistSocket(hasJoinedRoom ? roomId : '');
  useRoomSocket(hasJoinedRoom ? roomId : '');

  useEffect(() => {
    if (hasRequestedJoin.current) {
      return;
    }

    hasRequestedJoin.current = true;
    joinRoom.mutate(
      { roomId },
      {
        onError: () => {
          setHasJoinedRoom(false);
        },
        onSuccess: (data) => {
          setJoinedRoom(data);
          setPlaylist(data.playlist);
          setPlaybackState(data.playbackState, 'room-join');
          setHasJoinedRoom(true);
        },
      },
    );
  }, [joinRoom, roomId, setJoinedRoom, setPlaybackState, setPlaylist]);

  const handlePlayItem = (playlistItemId: string) => {
    void playbackCommands.changeTrack(roomId, playlistItemId);
  };

  const visibleRoom = roomFromStore;
  const visibleMembers = members.length > 0 ? members : FALLBACK_MEMBERS;
  const visiblePlaylist = playlist.length > 0 ? playlist : FALLBACK_PLAYLIST;
  const currentTrack =
    visiblePlaylist.find((item) => item.id === playbackState?.playlistItemId) ?? visiblePlaylist[0];
  const onlineMemberCount = visibleMembers.filter((member) => member.status === 'online').length;
  const isHost = visibleMembers.some(
    (member) => member.userId === FALLBACK_CURRENT_USER_ID && member.role === 'host',
  );

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#09090b]/95 px-5 md:px-6">
          <div className="flex items-center gap-2">
            <SyfityMark />
            <span className="text-base font-bold tracking-[-0.02em]">Syfity</span>
          </div>
          <button
            className="flex items-center gap-2 rounded-2xl p-1 text-sm text-white"
            type="button"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-700 text-xs font-semibold">
              민
            </span>
            <span className="hidden font-semibold md:inline">민지</span>
            <RoomIcon name="chevronDown" className="h-3.5 w-3.5 text-white/45" />
          </button>
        </header>

        <section className="flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#09090b]/95 px-5 md:px-6">
          <div>
            <h1 className="text-sm font-bold">{visibleRoom?.name ?? 'Chill Night 👑'}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-[#72f4a4]" />
              {onlineMemberCount}명 접속 중
            </p>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#72f4a4]/25 bg-[#72f4a4]/10 text-[#72f4a4] shadow-[0_0_16px_rgba(114,244,164,0.12)] md:h-8 md:w-auto md:px-4 md:text-xs md:font-bold"
            type="button"
          >
            <RoomIcon name="share" className="h-3.5 w-3.5" />
            <span className="hidden md:inline">초대</span>
          </button>
        </section>

        <section className="hidden min-h-0 flex-1 grid-cols-[200px_minmax(320px,1fr)_280px_280px] overflow-hidden border-b border-white/[0.07] lg:grid">
          <MemberSidebar members={visibleMembers} />
          <div className="min-w-0 border-r border-white/[0.07] px-6 py-6">
            <PlayerPanel roomId={roomId} isHost={isHost} playlist={visiblePlaylist} />
          </div>
          <PlaylistPanel
            fallbackPlaylist={visiblePlaylist}
            roomId={roomId}
            isHost={isHost}
            isReady={hasJoinedRoom}
            onPlayItem={handlePlayItem}
          />
          <ChatPanel chats={FALLBACK_CHATS} />
        </section>

        <section className="flex flex-1 flex-col overflow-hidden lg:hidden">
          {!isHost ? <HostConnectionNotice /> : null}
          <div className="px-5 py-4">
            <PlayerPanel roomId={roomId} isHost={isHost} playlist={visiblePlaylist} />
          </div>
          <MobileTabs activeTab={activeMobileTab} onChange={setActiveMobileTab} />
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/[0.07] pb-20">
            {activeMobileTab === 'playlist' ? (
              <PlaylistPanel
                fallbackPlaylist={visiblePlaylist}
                roomId={roomId}
                isHost={isHost}
                isReady={hasJoinedRoom}
                onPlayItem={handlePlayItem}
              />
            ) : null}
            {activeMobileTab === 'members' ? <MemberList members={visibleMembers} /> : null}
            {activeMobileTab === 'chat' ? <ChatPanel chats={FALLBACK_CHATS} compact /> : null}
          </div>
        </section>

        <MiniPlayer currentTrack={currentTrack} isPlaying={playbackState?.isPlaying ?? true} />
      </div>
    </main>
  );
}

function SyfityMark() {
  return (
    <span
      className="inline-block h-8 w-8 shrink-0 text-[#72f4a4] drop-shadow-[0_0_14px_rgba(114,244,164,0.35)]"
      style={getIconMaskStyle(BRAND_MARK_PATH)}
      aria-hidden
    />
  );
}

interface MemberSidebarProps {
  members: RoomMember[];
}

function MemberSidebar({ members }: MemberSidebarProps) {
  const onlineCount = members.filter((member) => member.status === 'online').length;

  return (
    <aside className="flex min-h-0 flex-col border-r border-white/[0.07] bg-[#09090b]">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] px-4">
        <span className="text-xs font-bold tracking-[0.1em] text-white/40 uppercase">멤버</span>
        <span className="rounded-full border border-[#72f4a4]/20 bg-[#72f4a4]/10 px-2.5 py-1 text-xs font-semibold text-[#72f4a4]">
          {onlineCount}명
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MemberList members={members} compact />
      </div>
    </aside>
  );
}

function MemberList({ compact = false, members }: MemberSidebarProps & { compact?: boolean }) {
  const onlineMembers = members.filter((member) => member.status === 'online');
  const offlineMembers = members.filter((member) => member.status !== 'online');

  return (
    <div className={compact ? 'space-y-5 p-4' : 'space-y-5 p-5'}>
      <MemberGroup members={onlineMembers} title={`온라인 · ${onlineMembers.length}`} />
      <MemberGroup isMuted members={offlineMembers} title={`오프라인 · ${offlineMembers.length}`} />
    </div>
  );
}

function MemberGroup({
  isMuted = false,
  members,
  title,
}: {
  isMuted?: boolean;
  members: RoomMember[];
  title: string;
}) {
  if (members.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-3 text-[10px] font-bold tracking-[0.05em] text-white/25 uppercase">
        {title}
      </p>
      <div className="space-y-1.5">
        {members.map((member) => (
          <div
            className={`flex items-center gap-3 rounded-2xl px-2 py-1.5 ${
              member.role === 'host' && !isMuted ? 'bg-white/[0.025]' : ''
            }`}
            key={member.userId}
          >
            <Avatar label={member.nickname} muted={isMuted} />
            <div className="min-w-0">
              <p
                className={`truncate text-sm font-semibold ${
                  isMuted ? 'text-white/35' : 'text-white/90'
                }`}
              >
                {member.nickname}
                {member.role === 'host' ? (
                  <RoomIcon name="crown" className="ml-1 inline-block h-2.5 w-2.5 text-[#f4d772]" />
                ) : null}
              </p>
              <p className="text-xs text-white/35">{isMuted ? '오프라인' : '온라인'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileTabs({
  activeTab,
  onChange,
}: {
  activeTab: RoomMobileTab;
  onChange: (tab: RoomMobileTab) => void;
}) {
  const tabs: Array<{ id: RoomMobileTab; label: string; icon: RoomIconName }> = [
    { icon: 'playlist', id: 'playlist', label: '재생목록' },
    { icon: 'users', id: 'members', label: '멤버' },
    { icon: 'chat', id: 'chat', label: '채팅' },
  ];

  return (
    <div className="grid grid-cols-3 border-t border-white/[0.07] bg-[#09090b]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            className={`relative flex h-12 items-center justify-center gap-1.5 text-sm font-bold ${
              isActive ? 'text-[#72f4a4]' : 'text-white/42'
            }`}
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
          >
            <RoomIcon name={tab.icon} className="h-3.5 w-3.5" />
            {tab.label}
            {isActive ? <span className="absolute bottom-0 h-0.5 w-full bg-[#72f4a4]" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function ChatPanel({ chats, compact = false }: { chats: ChatMessage[]; compact?: boolean }) {
  return (
    <aside
      className={
        compact ? 'flex min-h-[360px] flex-col bg-[#09090b]' : 'flex min-h-0 flex-col bg-[#09090b]'
      }
    >
      {!compact ? (
        <div className="flex h-12 shrink-0 items-center border-b border-white/[0.07] px-4">
          <h2 className="text-xs font-semibold text-white/55">채팅</h2>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6">
        <p className="mx-auto w-fit rounded-full bg-white/[0.055] px-3 py-1 text-xs text-white/35">
          민지님이 방을 만들었습니다
        </p>
        {chats.map((chat) => (
          <div className="flex items-start gap-3" key={chat.id}>
            <Avatar label={chat.nickname ?? 'S'} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white/90">
                {chat.nickname}
                <span className="ml-1 font-normal text-white/25">
                  {formatChatTime(chat.createdAt)}
                </span>
              </p>
              <p className="mt-1 text-sm leading-5 text-white/72">{chat.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-white/[0.07] p-4">
        <div className="flex h-11 items-center rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white/32">
          메시지 입력...
          <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-white/35">
            <RoomIcon name="send" className="h-3 w-3" />
          </span>
        </div>
      </div>
    </aside>
  );
}

function MiniPlayer({
  currentTrack,
  isPlaying,
}: {
  currentTrack: PlaylistItem | undefined;
  isPlaying: boolean;
}) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center gap-4 border-t border-white/[0.08] bg-[#09090b]/[0.97] px-5 pt-px backdrop-blur lg:static lg:px-6">
      <div className="flex min-w-0 flex-[0_0_224px] items-center gap-3">
        <TrackArtwork track={currentTrack} />
        <div className="min-w-0 flex-[0_1_84px]">
          <p className="truncate text-xs font-semibold text-white">
            {currentTrack?.title ?? 'Night Changes'}
          </p>
          <p className="truncate text-xs text-white/45">
            {currentTrack?.channelTitle ?? 'One Direction'}
          </p>
        </div>
        <button className="hidden text-white/35 sm:block" type="button" aria-label="좋아요">
          <RoomIcon name="like" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
        <div className="flex h-9 items-center justify-center gap-4">
          <button
            className="hidden h-4 w-4 items-center justify-center text-xs text-white/42 md:flex"
            type="button"
            aria-label="셔플"
          >
            <RoomIcon name="shuffle" className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-5 w-5 items-center justify-center text-sm text-white/55"
            type="button"
            aria-label="이전 곡"
          >
            <RoomIcon name="previous" className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#72f4a4] text-xs font-bold text-[#07150d] shadow-[0_0_9px_rgba(114,244,164,0.31)]"
            type="button"
            aria-label={isPlaying ? '일시정지' : '재생'}
          >
            <RoomIcon name={isPlaying ? 'pause' : 'play'} className="h-4 w-4" />
          </button>
          <button
            className="flex h-5 w-5 items-center justify-center text-sm text-white/55"
            type="button"
            aria-label="다음 곡"
          >
            <RoomIcon name="next" className="h-4 w-4" />
          </button>
          <button
            className="hidden h-4 w-4 items-center justify-center text-xs text-white/42 md:flex"
            type="button"
            aria-label="반복 재생"
          >
            <RoomIcon name="repeat" className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="hidden w-full max-w-96 items-center gap-2 text-xs leading-4 text-white/38 lg:flex">
          <span>1:23</span>
          <div className="relative h-1 min-w-0 flex-1 rounded-full bg-white/10">
            <div className="relative h-full w-[36%] rounded-full bg-gradient-to-r from-[#72f4a4] to-[#885cf6]">
              <span className="absolute top-1/2 right-0 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#09090b] bg-[#72f4a4] shadow-[0_0_8px_rgba(114,244,164,0.8)]" />
            </div>
          </div>
          <span>{currentTrack ? formatDuration(currentTrack.duration) : '3:46'}</span>
        </div>
      </div>

      <div className="hidden flex-[0_0_144px] items-center justify-end gap-2 lg:flex">
        <RoomIcon name="volume" className="h-3.5 w-3.5 text-white/42" />
        <div className="h-1 w-[123px] rounded-full bg-white/10">
          <div className="h-full w-3/4 rounded-full bg-white/38" />
        </div>
      </div>
    </footer>
  );
}

function HostConnectionNotice() {
  return (
    <div className="flex h-9 items-center gap-2 bg-[#171323] px-5 text-xs text-[#b784ff]">
      <RoomIcon name="wifiOff" className="h-3.5 w-3.5" />
      <span className="min-w-0 flex-1 truncate">
        호스트 연결이 끊겼습니다. 재접속을 기다리는 중...
      </span>
      <span className="font-bold">0:25</span>
      <RoomIcon name="refresh" className="h-3.5 w-3.5" />
    </div>
  );
}

function Avatar({
  label,
  muted = false,
  size = 'md',
}: {
  label: string;
  muted?: boolean;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  const toneClass = getAvatarTone(label);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${toneClass} ${
        muted ? 'opacity-45' : ''
      } ${sizeClass}`}
    >
      {label.slice(0, 1)}
      {size === 'md' ? (
        <span
          className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[#09090b] ${
            muted ? 'bg-white/18' : 'bg-[#72f4a4] shadow-[0_0_6px_rgba(114,244,164,0.9)]'
          }`}
        />
      ) : null}
    </span>
  );
}

function getAvatarTone(label: string) {
  const code = Array.from(label).reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return AVATAR_TONES[code % AVATAR_TONES.length];
}

function TrackArtwork({ track }: { track: PlaylistItem | undefined }) {
  if (track) {
    return (
      <span
        className="h-10 w-10 shrink-0 rounded-2xl bg-cover bg-center"
        style={{ backgroundImage: `url(${getTrackThumbnailUrl(track)})` }}
        role="img"
        aria-label={`${track.title} 썸네일`}
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a8f7ca] via-[#234b60] to-[#f05f72] text-xs font-bold text-black">
      N
    </div>
  );
}

function getTrackThumbnailUrl(track: PlaylistItem) {
  if (track.thumbnailUrl) {
    return track.thumbnailUrl;
  }

  return `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
}

function formatChatTime(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function RoomIcon({ className = '', name }: { className?: string; name: RoomIconName }) {
  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={getIconMaskStyle(ROOM_ICON_PATHS[name])}
      aria-hidden
    />
  );
}

function getIconMaskStyle(path: string) {
  return {
    WebkitMask: `url(${path}) center / contain no-repeat`,
    backgroundColor: 'currentColor',
    mask: `url(${path}) center / contain no-repeat`,
  };
}
