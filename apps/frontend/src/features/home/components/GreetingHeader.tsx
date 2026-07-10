import { LogIn, Plus } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';

interface GreetingHeaderProps {
  nickname: string;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  isLoading?: boolean;
}

export function GreetingHeader({
  nickname,
  onCreateRoom,
  onJoinRoom,
  isLoading,
}: GreetingHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        {isLoading ? (
          <div className="h-10 w-56 animate-pulse rounded-lg bg-white/10" />
        ) : (
          <h1 className="text-[30px] leading-[37.5px] font-bold text-white">
            안녕하세요, {nickname}님 👋
          </h1>
        )}
        <p className="text-sm text-white/50">함께 음악을 들을 방을 찾아보세요!</p>
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0 sm:self-start">
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="flex-1 sm:flex-initial"
          onClick={onJoinRoom}
        >
          <LogIn />
          코드 입장
        </Button>
        <Button
          type="button"
          variant="gradient"
          size="md"
          className="flex-1 sm:flex-initial"
          onClick={onCreateRoom}
        >
          <Plus />방 만들기
        </Button>
      </div>
    </div>
  );
}
