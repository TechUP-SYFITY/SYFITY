'use client';

// Room 채팅 패널의 메시지 목록과 입력 영역 뼈대를 표시한다.
import { Button, Input } from '@/shared/components/ui';
import type { ChatMessage } from '@/shared/types/domain';

import { formatChatTime } from './roomFormatters';
import { RoomIcon } from './RoomIcon';
import { RoomMemberAvatar } from './RoomMemberAvatar';

export function ChatPanel({ chats, compact = false }: { chats: ChatMessage[]; compact?: boolean }) {
  return (
    <aside
      className={
        compact
          ? 'flex h-full min-h-0 flex-col bg-background'
          : 'flex min-h-0 flex-1 flex-col bg-background'
      }
    >
      {!compact ? (
        <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
          <h2 className="text-xs font-semibold text-white/55">채팅</h2>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <p className="mx-auto w-fit rounded-full bg-input px-3 py-1 text-xs text-muted-foreground">
          방이 만들어졌습니다.
        </p>
        {chats.map((chat) => (
          <div className="flex items-start gap-3 py-0.5" key={chat.id}>
            <RoomMemberAvatar label={chat.nickname ?? 'S'} size="sm" />
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
      <div className="flex shrink-0 items-center gap-2 border-t border-border p-4">
        <Input
          className="h-10 min-w-0 flex-1 rounded-2xl bg-input"
          placeholder="메시지 입력..."
          readOnly
          aria-label="채팅 메시지 입력"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-xl border-0 bg-input text-white/35 hover:bg-muted/80"
          type="button"
          disabled
          aria-label="메시지 보내기"
        >
          <RoomIcon name="send" className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}
