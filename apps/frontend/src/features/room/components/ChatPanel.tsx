'use client';

// Room 채팅 패널의 메시지 목록과 입력 영역 뼈대를 표시한다.
import { Input } from '@/shared/components/ui';
import type { ChatMessage } from '@/shared/types/domain';

import { Avatar } from './Avatar';
import { formatChatTime } from './roomFormatters';
import { RoomIcon } from './RoomIcon';

export function ChatPanel({ chats, compact = false }: { chats: ChatMessage[]; compact?: boolean }) {
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
          방이 만들어졌습니다.
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
      <div className="relative shrink-0 border-t border-white/[0.07] p-4">
        <Input
          className="rounded-2xl bg-white/[0.055] pr-11"
          placeholder="메시지 입력..."
          readOnly
          aria-label="채팅 메시지 입력"
        />
        <RoomIcon
          name="send"
          className="pointer-events-none absolute top-1/2 right-8 h-3 w-3 -translate-y-1/2 text-white/35"
        />
      </div>
    </aside>
  );
}
