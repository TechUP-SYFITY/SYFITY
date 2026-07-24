'use client';

import { ChevronDown, FileText, ListMusic, LogOut, Settings, Shield } from 'lucide-react';
import Link from 'next/link';
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
    return <div className="h-10 w-24 animate-pulse rounded-full bg-white/10" aria-hidden />;
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
          className="flex cursor-pointer items-center gap-2 rounded-full text-white outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar size="sm">
            {me.profileImage && <AvatarImage src={me.profileImage} alt={me.nickname} />}
            <AvatarFallback>{getInitial(me.nickname)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-bold">{me.nickname}</span>
          <ChevronDown className="size-4 text-white/45" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="text-sm font-semibold text-white">{me.nickname}</span>
          <span className="text-xs font-normal text-white/48">{me.email}</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/playlists">
            <ListMusic aria-hidden />내 플레이리스트
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden />
            설정
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/terms">
            <FileText aria-hidden />
            이용약관
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/privacy">
            <Shield aria-hidden />
            개인정보처리방침
          </Link>
        </DropdownMenuItem>

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
