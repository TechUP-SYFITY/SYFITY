'use client';

import { LogOut } from 'lucide-react';
import { useEffect } from 'react';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui';

import { authApi, type AuthApi } from '../api/authApi';
import { useLogout, useMe } from '../hooks/useAuth';

interface UserMenuProps {
  api?: AuthApi;
}

const getInitial = (nickname: string) => nickname.trim().charAt(0).toUpperCase() || '?';

export function UserMenu({ api = authApi }: UserMenuProps) {
  const { data: me, isPending, error } = useMe(api);
  const logout = useLogout(api);
  useEffect(() => {
    if (error?.code === 'AUTH_USER_NOT_FOUND' && typeof window !== 'undefined') {
      window.location.href = '/login?reauth=1';
    }
  }, [error]);

  if (error?.code === 'AUTH_USER_NOT_FOUND') {
    return null;
  }
  if (isPending) {
    return <div className="size-10 animate-pulse rounded-full bg-white/10" aria-hidden />;
  }

  if (!me) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="사용자 메뉴"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar>
            {me.profileImage && <AvatarImage src={me.profileImage} alt={me.nickname} />}
            <AvatarFallback>{getInitial(me.nickname)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="text-sm font-semibold text-white">{me.nickname}</span>
          <span className="text-xs font-normal text-white/48">{me.email}</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          onSelect={(event) => {
            event.preventDefault();
            logout.mutate();
          }}
        >
          <LogOut aria-hidden />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
